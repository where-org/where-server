#!/usr/bin/env node

import http from 'node:http';
import path from 'node:path';

import * as where from '../index.js';

// main
const main = async (dir) => {

  const port = process.env.npm_config_port || '5570',
        bind = process.env.npm_config_bind || '0.0.0.0';

  // server
  const server = http.createServer(await where.server(dir));

  // socket
  const { socket } = await import('@where-org/where-socket').catch(err => {

    if (err.code !== 'ERR_MODULE_NOT_FOUND') {
      ;;; where.log({ error: err.stack });
    }

    return { socket: null };

  });

  if (socket) {
    const webSocketServer = await socket(dir, server).catch(err => {
      if (!err instanceof AggregateError) {
        throw err;
      }
      ;;; where.log({ error: err.message });
    });
  }

  server.listen(port, bind, () => {
    ;;; where.log(`Listening on ${bind}:${port}`);
  });

  server.on('error', (err) => {

    const { code, syscall } = err;

    if (syscall !== 'listen') {
      throw err;
    }

    const { [code]: error } = {
      EACCES    : `Bind ${port} requires elevated privileges`,
      EADDRINUSE: `Port ${port} is already in use`
    };

    if (!error) {
      throw err;
    }

    ;;; where.log({ error });
    process.exit(1);
  });

};

const [, , dir] = process.argv;
main(path.resolve(...(dir ? [dir] : [import.meta.dirname, '../config'])));
