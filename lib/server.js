import path from 'node:path';
import fs from 'node:fs/promises';

import express from 'express';
import morgan from 'morgan';

import expressIpFilter from 'express-ipfilter';
const { IpFilter, IpDeniedError } = expressIpFilter;

// common
import { common, cq, da, define, ServerException, ServerError } from '@where-org/where-common';

const { status } = define,
      file = { read: common.file.read };

const { filter } = da;

// server
import * as s from './server/index.js';
const { init, cors, token: createToken, upload: createUpload, ...ls } = s;

// app
import * as a from './app/index.js';
const { resolve, ...la } = a;

// mode
const mode = process.env.npm_config_mode || process.env.NODE_ENV || 'development',
      development = (mode === 'development') ? true : false;

// index
const indexAppModule = '#module/where-server-app-server-information',
      indexAppScope = 'apps';

/* log */
const log = common.init.log('server');

/* loadConfig */
const loadConfig = async (dir) => {
  return await common.config.load(dir, mode, 'server');
};

/* mergeSpec */
const mergeSpec = async (appConfig, specConfig) => {

  const resolveImportPathAppConfig = Object.entries(appConfig).reduce((o, [k, v]) => (
    { ...o, [k]: { ...v, importPath: v.importPath.indexOf('#module') === 0 ? import.meta.resolve(v.importPath) : v.importPath } }
  ), {});

  return await common.config.mergeSpec(resolveImportPathAppConfig, specConfig);
};

/* createServer */
const createServer = async (dir, c) => {

  // env
  const { name, version } = await common.file.read.json(path.resolve(import.meta.dirname, '../package.json')),
         tmpdir = path.resolve(dir, c.server.http.tmpdir);

  const env = Object.entries({ name, version, mode, tmpdir }).reduce((o, [k, v]) => {

    const key = common.util.casing.camelToSnake(k).toUpperCase();
    return { ...o, [`SERVER_${key}`]: v };

  }, {});

  // where object
  const where = {
    log,

    app: {
      env,
      define: { status }, cq, da: { filter }, app: { resolve: resolve(dir), ...la },
      common: { ...common, file }, ServerException, 
    },

    router: {
      define: { status }, cq, da, server: ls, log: common.init.log('router'), common, ServerException, ServerError,
    },
  };

  // where server app
  const apps = await init(c, where.app);

  // middleware
  const token = await createToken(c.server.token, where.router, apps),
        upload = createUpload(tmpdir, c.server.http.limit, define.filesKey);

  const middleware = Object.entries({ token, upload }).reduce((o, [k, v]) => {
    return { ...o, [k]: { ...v, middleware: v.middleware } };
  }, {});

  // server
  const server = express();

  // signature
  server.disable('x-powered-by');

  // proxy
  server.set('trust proxy', true);

  // cors
  server.use(cors(c.server.cors).middleware);

  // limit
  const reviver = (k, v) => (common.util.date.isIsoString(v)) ? new Date(v) : v;

  server.use(express.json({ limit: c.server.http.limit, reviver, extended: true }));
  server.use(express.urlencoded({ limit: c.server.http.limit, extended: true }));

  // json
  server.set('json spaces', development ? 2 : 0);

  // index
  if (c.server.http.index) {

    const [indexAppName] = Object.entries(c.app).map(
      ([k, v]) => v.app.module === indexAppModule ? k : null).filter(v => v);

    server.get(c.server.http.prefix, (req, res, next) => {

      if (!indexAppName) {
        throw new ServerException(status.code404.number);
      }

      req.url = path.join(
        c.server.http.prefix, c.server.api.version[c.server.api.version.length - 1], indexAppName, indexAppScope);

      next();

    });

    if (c.server.http.prefix !== '/') {
      server.use('/', express.Router().get('/', (req, res) => res.redirect(c.server.http.prefix)));
    }

  }

  // static
  server.use((
    c.server.static.prefix !== undefined) ? c.server.static.prefix : c.server.http.prefix || '',
    express.static(path.resolve(dir, c.server.static.dir || '../public'))
  );

  // logging
  morgan.token('date', () => {
    const [, p1, p2, p3, p4, p5] = new Date().toString().replace(/[A-Z]{3}\+/,'+').split(/ /);
    return `${p2}/${p1}/${p3}:${p4} ${p5}`;
  });

  const loggingExcludedPaths = Object.entries(c.app).map(([k, v]) => {

    if (!('logging' in v) || !v.logging.skip) {
      return;
    }

    const { scope = [''] } = v.logging;

    return (Array.isArray(scope) ? scope : [scope]).map(scope => (
      c.server.api.version.map(v => path.join(c.server.http.prefix, v, k, scope))
    )).flat();

  }).filter(v => v).flat();

  const logging = morgan(development ? 'dev' : 'combined', {
    skip: (req, res) => loggingExcludedPaths.some(v => req.originalUrl.startsWith(v)),
  });

  server.use(logging);

  // ip filter
  const ipFilterOption = { mode: 'allow', log: false, detectIp: (req, res) => (
    req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.ip
  ) };

  Object.entries(c.app).forEach(([k, v]) => {

    if (!('allow' in v)) {
      return;
    }

    v.allow.forEach(v => {
      const { scope = [''], range } = v;

      const paths = (Array.isArray(scope) ? scope : [scope]).map(scope => (
        c.server.api.version.map(v => path.join(c.server.http.prefix, v, k, scope))
      ));

      server.use(paths, IpFilter([range], ipFilterOption));
    });

  });

  // router
  const router = await c.server.api.version.reduce(async (o, k) => {

    const { [`rest-${k}`]: router } = await import(`./router/index.js`);
    return { ...await o, [k]: router };

  }, {});

  await Promise.all(Object.entries(router).map(async ([k, v]) => {
    server.use(path.join(c.server.http.prefix, k), await v(c, where.router, apps, middleware, express.Router()));
  }));

  // 404 error handling
  server.use((req, res, next) => {
    return res.status(status.code404.number).send({ error: status.code404.message });
  });

  // error handling
  server.use((err, req, res, next) => {

    ;;; (development) ? console.error(err) : where.log({ error: err.stack });

    // entity.too.large
    if (err.type && err.type === 'entity.too.large') {
      return res.status(status.code413.number).send({ error: status.code413.message });
    }

    // LIMIT_FILE_SIZE
    if (err.code && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(status.code413.number).send({ error: status.code413.message });
    }

    // IpDeniedError
    if (err instanceof IpDeniedError) {
      return res.status(status.code404.number).send({ error: status.code404.message });
    }

    // Access-Control-Expose-Headers
    const accessControlExposeHeaders = 'Access-Control-Expose-Headers';

    // ServerException
    if (err instanceof ServerException) {

      const { debug, status } = err,
            { header } = ServerException;

      res.header(accessControlExposeHeaders, [accessControlExposeHeaders, header].join(','));
      res.set(header, encodeURIComponent(development && debug ? debug : ''));

      return res.status(status.code.number).send({ error: status.code.message });

    }

    // ServerError
    if (err instanceof ServerError) {

      const { debug, status } = err,
            { header } = ServerError;

      res.header(accessControlExposeHeaders, [accessControlExposeHeaders, header].join(','));
      res.set(header, encodeURIComponent(development && debug ? debug : ''));

      return res.status(status.code.number).send({ error: status.code.message });

    }

    // ServerError
    const { header } = ServerError;

    res.header(accessControlExposeHeaders, [accessControlExposeHeaders, header].join(','));

    res.set(header, encodeURIComponent(
      development ? `${err.name}: ${err.message}` : ''
    ));

    return res.status(status.code500.number).send({ error: status.code500.message });

  });

  ;;; where.log({ message: 'Hello!', mode });

  // end
  const end = async (code) => {

    await Promise.all((await fs.readdir(tmpdir)).map(async v => {

      await fs.rm(path.join(tmpdir, v), { recursive: true, force: true }).catch(err => {
        ;;; where.log({ error: err.message });
      });

    }));

    await Promise.all(Object.entries(apps).map(async([k, v]) => {
      if (v.end) {
        await v.end();
      }
    }));

    process.exit(code);

  }

  Object.entries({ SIGINT: 2, SIGTERM: 15 }).map(([k, v]) => {
    process.on(k, async () => await end(v));
  });

  process.on('exit', async (code) => {
    ;;; where.log({ message: 'See you!' });
  });

  return server;

};

export { createServer, loadConfig, mergeSpec, log, };
