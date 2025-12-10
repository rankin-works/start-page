#!/usr/bin/env python3
"""
Homelab Service Status Checker
For TrueNAS SCALE deployment at 10.0.0.13
Accessible via https://status.rankin.works/status
"""

import asyncio
import aiohttp
from aiohttp import web
import aiohttp_cors
import socket
import logging
import sys
import traceback
from typing import Dict, Any
import json
import argparse
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('status_service.log')
    ]
)
logger = logging.getLogger(__name__)


class ServiceStatusChecker:
    def __init__(self, services: Dict[str, str]):
        self.services = services
        self.status_cache = {}
        self.timeout = 5  # seconds
        logger.info(f"Initialized ServiceStatusChecker with {len(services)} services")

    async def check_service(self, name: str, url: str) -> Dict[str, Any]:
        """Check the status of a service with TCP + HTTP validation"""
        logger.debug(f"Checking service: {name} at {url}")
        
        try:
            # Parse hostname and port from URL
            is_https = url.startswith('https')
            hostname = url.replace('https://', '').replace('http://', '').split('/')[0]
            port = 443 if is_https else 80
            
            # Step 1: TCP Connection Check
            tcp_ok = False
            try:
                # Use asyncio for non-blocking socket check
                loop = asyncio.get_running_loop()
                await asyncio.wait_for(
                    loop.run_in_executor(
                        None, 
                        lambda: socket.create_connection((hostname, port), timeout=self.timeout)
                    ),
                    timeout=self.timeout
                )
                tcp_ok = True
                logger.debug(f"TCP connection successful for {name}")
            except (socket.timeout, ConnectionRefusedError, OSError, asyncio.TimeoutError) as e:
                logger.warning(f"TCP connection failed for {name}: {e}")
                return {
                    'status': 'offline',
                    'last_checked': datetime.now().isoformat(),
                    'error': f'TCP connection failed: {str(e)}'
                }

            # Step 2: HTTP Head Request (only if TCP succeeded)
            if tcp_ok:
                try:
                    # Create SSL context that doesn't verify (for self-signed certs behind Cloudflare)
                    connector = aiohttp.TCPConnector(ssl=False)
                    async with aiohttp.ClientSession(connector=connector) as session:
                        async with session.head(
                            url, 
                            timeout=aiohttp.ClientTimeout(total=self.timeout),
                            allow_redirects=True
                        ) as response:
                            # Consider 2xx, 3xx, and even 401/403 as "online" 
                            # (auth-protected services are still running)
                            status = 'online' if response.status < 500 else 'offline'
                            logger.info(f"Service {name}: HTTP {response.status} -> {status}")
                            return {
                                'status': status,
                                'http_code': response.status,
                                'last_checked': datetime.now().isoformat()
                            }
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    logger.warning(f"HTTP check failed for {name}: {e}")
                    # TCP worked but HTTP failed - might still be "online" (non-HTTP service)
                    return {
                        'status': 'online',
                        'last_checked': datetime.now().isoformat(),
                        'note': 'TCP reachable, HTTP check failed'
                    }

        except Exception as e:
            logger.error(f"Unexpected error checking {name}: {e}")
            logger.error(traceback.format_exc())
            return {
                'status': 'offline',
                'last_checked': datetime.now().isoformat(),
                'error': str(e)
            }

    async def check_all_services(self):
        """Concurrently check status of all services"""
        logger.info("Starting service status check")
        tasks = [
            self.check_service(name, url) 
            for name, url in self.services.items()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Update status cache
        for (name, _), result in zip(self.services.items(), results):
            if isinstance(result, Exception):
                self.status_cache[name] = {
                    'status': 'offline',
                    'last_checked': datetime.now().isoformat(),
                    'error': str(result)
                }
            else:
                self.status_cache[name] = result
        
        logger.info(f"Status check complete: {sum(1 for v in self.status_cache.values() if v.get('status') == 'online')}/{len(self.status_cache)} online")

    async def status_handler(self, request):
        """Web handler to return service statuses as JSON"""
        logger.debug("Status request received")
        return web.json_response(self.status_cache)
    
    async def health_handler(self, request):
        """Health check endpoint for monitoring"""
        return web.json_response({
            'healthy': True,
            'service_count': len(self.services),
            'timestamp': datetime.now().isoformat()
        })

    async def periodic_check(self):
        """Periodically update service statuses"""
        while True:
            try:
                await self.check_all_services()
            except Exception as e:
                logger.error(f"Error during periodic check: {e}")
            await asyncio.sleep(30)  # Check every 30 seconds


def load_services_config(config_path: str) -> Dict[str, str]:
    """Load services from a JSON configuration file"""
    try:
        logger.info(f"Loading services from {config_path}")
        with open(config_path, 'r') as f:
            services = json.load(f)
        logger.info(f"Loaded {len(services)} services from config")
        return services
    except FileNotFoundError:
        logger.error(f"Config file not found: {config_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in config file: {config_path} - {e}")
        return {}


async def start_background_tasks(app):
    """Start background service checking task"""
    logger.info("Starting background tasks")
    app['periodic_check'] = asyncio.create_task(app['checker'].periodic_check())


async def cleanup_background_tasks(app):
    """Clean up background tasks on shutdown"""
    logger.info("Cleaning up background tasks")
    app['periodic_check'].cancel()
    try:
        await app['periodic_check']
    except asyncio.CancelledError:
        pass


def create_app(services: Dict[str, str], allowed_origins: list = None):
    """Create and configure the web application with CORS"""
    logger.info("Creating web application")
    
    app = web.Application()
    app['checker'] = ServiceStatusChecker(services)
    
    # Set up CORS - this is critical for browser access
    if allowed_origins is None:
        allowed_origins = [
            "https://home.rankin.works",
            "https://status.rankin.works",
            "http://localhost:5500",
            "http://localhost:5501",
            "http://localhost:5502",
            "http://127.0.0.1:5500",
            "http://127.0.0.1:5501",
            "http://127.0.0.1:5502",
        ]
    
    cors = aiohttp_cors.setup(app, defaults={
        origin: aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods=["GET", "OPTIONS"]
        ) for origin in allowed_origins
    })
    
    # Add routes
    status_route = app.router.add_get('/status', app['checker'].status_handler)
    health_route = app.router.add_get('/health', app['checker'].health_handler)
    
    # Apply CORS to routes
    cors.add(status_route)
    cors.add(health_route)
    
    # Lifecycle hooks
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    
    return app


def main():
    parser = argparse.ArgumentParser(description='Homelab Service Status Checker')
    parser.add_argument('-c', '--config', 
                        default='services.json', 
                        help='Path to services configuration file')
    parser.add_argument('-p', '--port', 
                        type=int, 
                        default=8082, 
                        help='Port to run the status service')
    parser.add_argument('--host',
                        default='0.0.0.0',
                        help='Host to bind to')
    args = parser.parse_args()

    # Load services from config
    services = load_services_config(args.config)
    
    if not services:
        logger.error("No services configured. Exiting.")
        sys.exit(1)

    # Create and run web application
    try:
        app = create_app(services)
        logger.info(f"Starting service on {args.host}:{args.port}")
        web.run_app(app, host=args.host, port=args.port, print=None)
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == '__main__':
    main()