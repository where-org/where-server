import { at } from './at.js';

const router = async (config, where, app, middleware, router) => {

  const { cq, da, define, server } = where,
        { status } = define;

  const { token, upload } = middleware,
        limit = { offset: 0, limit: 1000 };

  const r1 = /^[\w\-.+@|]+$/;

  // router.param
  ['name', 'scope'].forEach(v => {

    router.param(v, (req, res, next, value) => {
      if (!r1.test(value)) {
        throw new where.ServerException(status.code404.number);
      }
      next();
    });

  });

  const precheck = async (req, res, next) => {

    const { name, scope } = req.params;

    if (!(name in app)) {
      throw new where.ServerException(status.code404.number);
    }

    if (config.app[name].auth === undefined) {
      return next(new where.ServerException(status.code403.number));
    }

    // Authorization and X-API-Key
    const [bearer, accessToken] = (req.headers['authorization'] || '').split(' '),
          [xApiKey, apiKey] = (req.headers['x-api-key'] || '').split('_');

    if (config.app[name].auth !== null) {

      if (!(bearer === 'Bearer' && accessToken || xApiKey === 'whr' && apiKey)) {
        return next(new where.ServerException(status.code401.number));
      }

    }

    // verify
    if ('verify' in app[name]) {

      const result = await app[name].verify(
        accessToken ? { bearer: accessToken } : apiKey ? { apiKey } : null
      );

      if (!result) {
        return next(new where.ServerException(status.code401.number));
      }

      // scope
      const grantedScopes = result.scope?.split(' ');

      //'@'
      if (!(grantedScopes && (grantedScopes.includes(scope) || grantedScopes.includes('*')))) {
        return next(new where.ServerException(status.code403.number));
      }

      req.user = result;

    }

    next();

  };

  /* auth */

  // login
  router.post('/:name', async (req, res, next) => {

    const { name } = req.params;

    if (!(name in app)) {
      throw new where.ServerException(status.code404.number);
    }

    if (!('login' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

    const { user = '', password = '' } = req.body ?? {};

    const result = await app[name].login(user, password);

    if (!result) {
      throw new where.ServerException(status.code401.number);
    }

    return res.send(result);

  });

  // refresh
  router.put('/:name', async (req, res, next) => {

    const { name } = req.params;

    if (!app[name]) {
      throw new where.ServerException(status.code404.number);
    }

    if (!('refresh' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

    const { refreshToken = '' } = req.body ?? {};

    const result = await app[name].refresh(refreshToken);

    if (!result) {
      throw new where.ServerException(status.code401.number);
    }

    return res.send(result);

  });

  // delete
  //router.delete('/:name', async (req, res, next) => {
  //});

  /* app */

  // get
  router.get('/:name/:scope', precheck, async (req, res, next) => {

    const { name, scope } = req.params;

    if (!('get' in app[name]) && !(scope in at)) {
      throw new where.ServerException(status.code405.number);
    }

    // condition
    const condition = { limit };

    // ;;; where.log({ condition });

    const ref = server.ref(req, res);

    const result = await (!(scope in at)
      ? app[name].get(ref, scope, condition): at[scope](ref, config, where, name, condition));

    return res.send(result);

  });

  router.get('/:name/:scope/*cs', precheck, async (req, res, next) => {

    const { name, scope, cs: ca } = req.params,
          cs = ca.filter(v => v).join('/');

    if (!('get' in app[name]) && !(scope in at)) {
      throw new where.ServerException(status.code405.number);
    }

    // condition
    const { limit: l, ...swo } = await new Promise(r => r(cq.parse(cs))).catch(err => {
      throw new where.ServerException(status.code400.number);
    });

    const condition = { ...swo, limit: l || limit };

    // ;;; where.log({ condition });

    const ref = server.ref(req, res);

    const result = await (!(scope in at)
      ? app[name].get(ref, scope, condition) : at[scope](ref, config, where, name, condition));

    return res.send(result);

  });

  // post
  router.post('/:name/:scope', precheck, upload.middleware, async (req, res, next) => {

    const { name, scope } = req.params;

    if (!('post' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

    // data
    const data = da.parse(req.body ?? {}, req.header('Content-Type'));

    // ;;; where.log({ data });

    const ref = server.ref(req, res),
          result = await app[name].post(ref, scope, data, req.files || []);

    if (req.files) {
      upload.unlink(req.files);
    }

    return res.status(201).send(result);

  });

  // put
  router.put('/:name/:scope/*cs', precheck, upload.middleware, async (req, res, next) => {

    const { name, scope, cs: ca } = req.params,
          cs = ca.filter(v => v).join('/');

    if (!('put' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

    // data
    const data = da.parse(req.body ?? {}, req.header('Content-Type'));

    // condition
    const condition = await new Promise(r => r(cq.parse(cs))).catch(err => {
      throw new where.ServerException(status.code400.number);
    });

    // ;;; where.log({ data, condition });

    const ref = server.ref(req, res),
          result = await app[name].put(ref, scope, data, condition, req.files || []);

    if (req.files) {
      upload.unlink(req.files);
    }

    return res.send(result);

  });

  // delete
  router.delete('/:name/:scope/*cs', precheck, async (req, res, next) => {

    const { name, scope, cs: ca } = req.params,
          cs = ca.filter(v => v).join('/');

    if (!('delete' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

    // condition
    const condition = await new Promise(r => r(cq.parse(cs))).catch(err => {
      throw new where.ServerException(status.code400.number);
    });

    // ;;; where.log({ condition });

    const ref = server.ref(req, res),
          result = await app[name].delete(ref, scope, condition);

    if (!result.length) {
      throw new where.ServerException(status.code404.number);
    }

    return res.send(result);

  });

  return router;

};

export { router };
