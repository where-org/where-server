#!/usr/bin/env node

import http from 'node:http';
import path from 'node:path';

import * as where from '../index.js';

const resolve = (module) => {
  return module.indexOf('#module') === -1 ? import.meta.resolve(module) : module;
};

// main
const main = async (dir) => {

  const port = process.env.npm_config_port || '5570',
        bind = process.env.npm_config_bind || '0.0.0.0';

  // config
  const serverConfig = await where.loadConfig(dir);

  const serverAppConfig = Object.entries(serverConfig.app).reduce((o, [k, v]) => (
    { ...o, [k]: { ...v, importPath: resolve(v.app.module) } }
  ), {});

  const serverAppMergedConfig = await where.mergeSpec(serverAppConfig, serverConfig.spec);

  // server
  const httpServer = http.createServer(
    await where.createServer(dir, { ...serverConfig, app: serverAppMergedConfig })
  );

  // socket
  const socket = await import('@where-org/where-socket').catch(err => {

    if (err.code !== 'ERR_MODULE_NOT_FOUND') {
      ;;; where.log({ error: err.stack });
    }
    return null;

  });

  if (socket) {

    const socketConfig = await socket.loadConfig(dir);

    const socketAppConfig = Object.entries(socketConfig.app).reduce((o, [k, v]) => (
      { ...o, [k]: { ...v, importPath: resolve(v.app.module) } }
    ), {});

    const socketAppMergedConfig = await socket.mergeSpec(socketAppConfig, socketConfig.spec);

    const webSocketServer = await socket.createSocket(
        { ...socketConfig, app: socketAppMergedConfig }, httpServer).catch(err => {

      if (!err instanceof AggregateError) {
        throw err;
      }
      ;;; where.log({ error: err.message });
    });

  }
  httpServer.listen(port, bind, () => {
    ;;; where.log(`Listening on ${bind}:${port}`);
  });

  httpServer.on('error', (err) => {

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
