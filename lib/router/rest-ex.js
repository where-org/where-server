import { at } from './at.js';
import { pipe } from './pipe.js';

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

  // post login
  router.post('/:name', async (req, res, next) => {

    const { name } = req.params;

    if (!app[name]) {
      throw new where.ServerException(status.code404.number);
    }

    const { auth: authConfig } = app[name].config;

    // auth is null or undefined
    if (authConfig === null || authConfig === undefined) {
      throw new where.ServerException(status.code405.number);
    }

    const ref = server.ref(req, res);

    const { user = '', password = '', passcode = '' } = req.body ?? {},
          { secret, expiresIn, refreshExpiresIn } = authConfig;

    const { authenticate, authorize } = app[name];

    // authenticate
    const authenticatedData = await authenticate(ref, user, password);

    if (!authenticatedData) {
      throw new where.ServerException(status.code401.number);
    }

    const { subject, ...userData } = authenticatedData;

    if (!subject) {
      throw new where.ServerError(
        status.code500.number, 'auth-module has an implementation error'
      );
    }

    // authorize
    const authorizedData = await authorize(subject, userData);

    if (!authorizedData) {
      throw new where.ServerException(status.code401.number);
    }

    const { scope, ...optionalUserData } = authorizedData;

    if (!scope) {
      throw new where.ServerError(
        status.code500.number, 'auth-module has an implementation error'
      );
    }

    // sign
    const payload = token.payload(subject, scope, optionalUserData);
    return res.send(await token.sign(secret, payload, expiresIn, refreshExpiresIn));

    /*
    // mfa
    const { activateColumn, secretColumn } = authConfig.mfa || {},
          { [activateColumn]: activateMfa, [secretColumn]: mfaSecret } = rawUserData;

    if (authConfig.mfa && activateMfa && !passcode) {
      return next(new where.ServerException(status.code400.number));
    }

    if (authConfig.mfa && activateMfa && !server.mfa.verify(mfaSecret, passcode)) {
      return next(new where.ServerException(status.code401.number));
    }
    */

  });

  // put token refresh
  router.put('/:name', async (req, res, next) => {

    const { name } = req.params;

    if (!app[name]) {
      throw new where.ServerException(status.code404.number);
    }

    const { auth: authConfig } = app[name].config;

    // auth is null or undefined
    if (authConfig === null || authConfig === undefined) {
      throw new where.ServerException(status.code405.number);
    }

    const { accessToken = '', refreshToken = '' } = req.body ?? {},
          { secret, expiresIn, refreshExpiresIn } = authConfig;

    const accessTokenVerify = await token.verify(secret, accessToken),
          refreshTokenVerify = await token.verify(accessToken, refreshToken);

    if (accessTokenVerify && refreshTokenVerify) {
      return res.send({ accessToken, refreshToken, expiresIn: accessTokenVerify.exp });
    }

    if (!refreshTokenVerify) {
      ;;; where.log({ error: 'refreshToken error' });
      throw new where.ServerException(status.code401.number);
    }

    const { sub, scp, ltd } = refreshTokenVerify,
          payload = token.payload(sub, { scp, ltd });

    return res.send(await token.sign(secret, payload, expiresIn, refreshExpiresIn));

  });

  // get
  router.get('/:name/:scope', token.middleware, async (req, res, next) => {

    const { name } = req.params,
          [scope, ...chain] = req.params.scope.split('|');

    // condition
    const condition = { limit };

    if (!('get' in app[name]) && !(scope in at)) {
      throw new where.ServerException(status.code405.number);
    }

    const ref = server.ref(req, res);

    const result = await (!(scope in at)
      ? app[name].get(ref, scope, condition) : at[scope](config, where, name, condition));

    return res.send(await chain.reduce(async (o, k) => {

      // error handling suru
      //if (!(k in where.pipe)) {
        //throw 
      //}

      return await pipe[k](where, await o, condition);

    }, result));

  });

  router.get('/:name/:scope/*cs', token.middleware, async (req, res, next) => {

    const { name, cs: ca } = req.params,
          [scope, ...chain] = req.params.scope.split('|');

    const cs = ca.filter(v => v).join('/');

    // condition
    const { limit: l, ...swo } = await new Promise(r => r(cq.parse(cs))).catch(err => {
      throw new where.ServerException(status.code400.number);
    });

    const condition = { ...swo, limit: l || limit };

    // ;;; where.log({ condition });

    if (!('get' in app[name]) && !(scope in at)) {
      throw new where.ServerException(status.code405.number);
    }

    const ref = server.ref(req, res);

    const result = await (!(scope in at)
      ? app[name].get(ref, scope, condition) : at[scope](config, where, name, condition));

    return res.send(await chain.reduce(async (o, k) => {

      // error handling suru
      //if (!(k in where.pipe)) {
        //throw 
      //}

      return await pipe[k](where, await o, condition);

    }, result));

  });

  // post
  router.post('/:name/:scope', token.middleware, upload.middleware, async (req, res, next) => {

    const { name, scope } = req.params,
          data = da.parse(req.body ?? {}, req.header('Content-Type'));

    if (!('post' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

    // ;;; where.log({ data });

    const ref = server.ref(req, res);

    const result = await app[name].post(ref, scope, data, req.files || []);

    if (req.files) {
      upload.unlink(req.files);
    }

    return res.status(201).send(result);

  });

  // put
  router.put('/:name/:scope/*cs', token.middleware, upload.middleware, async (req, res, next) => {

    const { name, scope, cs: ca } = req.params,
          cs = ca.filter(v => v).join('/');

    const data = da.parse(req.body ?? {}, req.header('Content-Type'));

    if (!('put' in app[name])) {
      throw new where.ServerException(status.code405.number);
    }

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
  router.delete('/:name/:scope/*cs', token.middleware, async (req, res, next) => {

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
