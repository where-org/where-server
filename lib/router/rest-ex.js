import { unlink } from 'fs/promises';
import { pipe } from './pipe.js';

const router = async (config, where, app, middleware, router) => {

  const { cq, da } = where;

  const { status } = where.define,
        { at, createRef } = where.server;

  const { precheck, upload } = middleware;

  const limit = { offset: 0, limit: 1000 },
        r1 = /^[\w\-.+@|]+$/;

  // router.param
  ['name', 'scope'].forEach(v => {

    router.param(v, (req, res, next, value) => {
      if (!r1.test(value)) {
        throw new where.ServerException(status.code404.number);
      }
      next();
    });

  });

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

    const { name } = req.params,
          [scope, ...chain] = req.params.scope.split('|');

    if (!('get' in app[name]) && !(scope in at)) {
      throw new where.ServerException(status.code405.number);
    }

    // condition
    const condition = { limit };

    // ;;; where.log({ condition });

    const ref = createRef(req, res);

    const result = await (!(scope in at)
      ? app[name].get(ref, scope, condition): at[scope](ref, config, where, name, condition));

    return res.send(await chain.reduce(async (o, k) => {

      // error handling suru
      //if (!(k in where.pipe)) {
        //throw 
      //}

      return await pipe[k](where, await o, condition);

    }, result));

  });

  router.get('/:name/:scope/*cs', precheck, async (req, res, next) => {

    const { name, cs: ca } = req.params,
          [scope, ...chain] = req.params.scope.split('|');

    const cs = ca.filter(v => v).join('/');

    if (!('get' in app[name]) && !(scope in at)) {
      throw new where.ServerException(status.code405.number);
    }

    // condition
    const { limit: l, ...swo } = await new Promise(r => r(cq.parse(cs))).catch(err => {
      throw new where.ServerException(status.code400.number);
    });

    const condition = { ...swo, limit: l || limit };

    // ;;; where.log({ condition });

    const ref = createRef(req, res);

    const result = await (!(scope in at)
      ? app[name].get(ref, scope, condition) : at[scope](ref, config, where, name, condition));

    return res.send(await chain.reduce(async (o, k) => {

      // error handling suru
      //if (!(k in where.pipe)) {
        //throw 
      //}

      return await pipe[k](where, await o, condition);

    }, result));

  });

  // post
  router.post('/:name/:scope', precheck, upload, async (req, res, next) => {

    const { name, scope } = req.params;

    if (!('post' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

    // data
    const data = da.parse(req.body ?? {}, req.header('Content-Type'));

    // ;;; where.log({ data });

    const ref = createRef(req, res),
          result = await app[name].post(ref, scope, data, req.files || []);

    if (req.files) {
      req.files.forEach(v => unlink(v.path, err => {}));
    }

    return res.status(201).send(result);

  });

  // put
  router.put('/:name/:scope/*cs', precheck, upload, async (req, res, next) => {

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

    const ref = createRef(req, res),
          result = await app[name].put(ref, scope, data, condition, req.files || []);

    if (req.files) {
      req.files.forEach(v => unlink(v.path, err => {}));
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

    const ref = createRef(req, res),
          result = await app[name].delete(ref, scope, condition);

    if (!result.length) {
      throw new where.ServerException(status.code404.number);
    }

    return res.send(result);

  });

  return router;

};

export { router };
