#!/usr/bin/env node
import { startServer } from './server.js';

const DEFAULT_PORT = 9099;

const arg = process.argv[2];
const port = arg ? parseInt(arg, 10) : DEFAULT_PORT;

if (isNaN(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${arg}`);
  console.error('Usage: warp-claude-proxy [port]');
  process.exit(1);
}

startServer(port);
