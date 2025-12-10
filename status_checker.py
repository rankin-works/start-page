#!/usr/bin/env python3

import asyncio
import aiohttp
from aiohttp import web
import socket
import ssl
import logging
import sys
import traceback
from typing import Dict, Any
import json
import argparse
from datetime import datetime

# Configure logging to be more verbose
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for more information
    format='%(asctime)s - %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Explicitly use stdout
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
        """
        Check the status of a service with multiple strategies
        """
        logger.debug(f"Checking service: {name} at {url}")
        try:
            # Parse URL
            parsed_url = url.replace('https://', '').replace('http://', '').split('/')
            hostname = parsed_url[0]
            
            # TCP Connection Check
            try:
                port = 443 if url.startswith('https') else 80
                logger.debug(f"Attempting TCP connection to {hostname}:{port}")
                socket.create_connection((hostname, port), timeout=self.timeout)
                tcp_check = True
            except (socket.timeout, ConnectionRefusedError) as e:
                logger.warning(f"TCP connection failed for {name}: {e}")
                tcp_check = False

            # HTTP Head Request Check
            if tcp_check:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.head(url, timeout=aiohttp.ClientTimeout(total=self.timeout)) as response:
                            status = 'online' if response.status < 400 else 'offline'
                            logger.info(f"Service {name} status: {status}")
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    logger.error(f"HTTP check failed for {name}: {e}")
                    status = 'offline'
            else:
                status = 'offline'

            return {
                'status': status,
                'last_checked': datetime.now().isoformat()
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
        """
        Concurrently check status of all services
        """
        logger.info("Starting service status check")
        tasks = [
            self.check_service(name, url) 
            for name, url in self.services.items()
        ]
        results = await asyncio.gather(*tasks)
        
        # Update status cache
        for (name, _), result in zip(self.services.items(), results):
            self.status_cache[name] = result

    async def status_handler(self, request):
        """
        Web handler to return service statuses
        """
        logger.debug("Status request received")
        return web.json_response(self.status_cache)

    async def periodic_check(self):
        """
        Periodically update service statuses
        """
        while True:
            await self.check_all_services()
            await asyncio.sleep(30)  # Check every 30 seconds

def load_services_config(config_path: str) -> Dict[str, str]:
    """
    Load services from a JSON configuration file
    """
    try:
        logger.debug(f"Loading services from {config_path}")
        with open(config_path, 'r') as f:
            services = json.load(f)
        logger.info(f"Loaded {len(services)} services from config")
        return services
    except FileNotFoundError:
        logger.error(f"Config file not found: {config_path}")
        return {}
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in config file: {config_path}")
        return {}

async def start_background_tasks(app):
    logger.info("Starting background tasks")
    app['periodic_check'] = asyncio.create_task(app['checker'].periodic_check())

async def cleanup_background_tasks(app):
    logger.info("Cleaning up background tasks")
    app['periodic_check'].cancel()
    await app['periodic_check']

def create_app(services: Dict[str, str]):
    logger.info("Creating web application")
    app = web.Application()
    app['checker'] = ServiceStatusChecker(services)
    app.router.add_get('/status', app['checker'].status_handler)
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
    args = parser.parse_args()

    # Load services from config
    services = load_services_config(args.config)
    
    if not services:
        logger.error("No services configured. Exiting.")
        return

    # Create and run web application
    try:
        app = create_app(services)
        logger.info(f"Attempting to start service on port {args.port}")
        
        # Use asyncio event loop to run the app
        loop = asyncio.get_event_loop()
        runner = web.AppRunner(app)
        loop.run_until_complete(runner.setup())
        site = web.TCPSite(runner, '0.0.0.0', args.port)
        loop.run_until_complete(site.start())
        
        logger.info(f"Service successfully started on 0.0.0.0:{args.port}")
        
        # Keep the loop running
        loop.run_forever()
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        logger.error(traceback.format_exc())
        raise

if __name__ == '__main__':
    main()
