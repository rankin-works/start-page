#!/usr/bin/env python3

import asyncio
import aiohttp
from aiohttp import web
import aiohttp_cors
import socket
import ssl
import logging
from typing import Dict, Any
import json
import argparse
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

class ServiceStatusChecker:
    def __init__(self, services: Dict[str, str]):
        self.services = services
        self.status_cache = {}
        self.timeout = 5  # seconds

    async def check_service(self, name: str, url: str) -> Dict[str, Any]:
        """
        Check the status of a service with multiple strategies
        """
        try:
            # Parse URL
            parsed_url = url.replace('https://', '').replace('http://', '').split('/')
            hostname = parsed_url[0]
            
            # TCP Connection Check
            try:
                port = 443 if url.startswith('https') else 80
                socket.create_connection((hostname, port), timeout=self.timeout)
                tcp_check = True
            except (socket.timeout, ConnectionRefusedError):
                tcp_check = False

            # HTTP Head Request Check
            if tcp_check:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.head(url, timeout=aiohttp.ClientTimeout(total=self.timeout)) as response:
                            status = 'online' if response.status < 400 else 'offline'
                except (aiohttp.ClientError, asyncio.TimeoutError):
                    status = 'offline'
            else:
                status = 'offline'

            logger.info(f"Service {name}: {status}")
            return {
                'status': status,
                'last_checked': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Unexpected error checking {name}: {e}")
            return {
                'status': 'offline',
                'last_checked': datetime.now().isoformat(),
                'error': str(e)
            }

    async def check_all_services(self):
        """
        Concurrently check status of all services
        """
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
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Config file not found: {config_path}")
        return {}
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in config file: {config_path}")
        return {}

async def start_background_tasks(app):
    app['periodic_check'] = asyncio.create_task(app['checker'].periodic_check())

async def cleanup_background_tasks(app):
    app['periodic_check'].cancel()
    await app['periodic_check']

def create_app(services: Dict[str, str]):
    app = web.Application()
    app['checker'] = ServiceStatusChecker(services)
    
    # Add CORS support
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
        )
    })

    # Add routes with CORS
    resource = cors.add(app.router.add_resource("/status"))
    cors.add(resource.add_route("GET", app['checker'].status_handler))
    
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
    app = create_app(services)
    web.run_app(app, port=args.port, host='127.0.0.1')
