const createPrecheck = (config, where, app) => {

  const { status } = where.define;

  const middleware = async (req, res, next) => {

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

      const payload = await app[name].verify(
        accessToken ? { bearer: accessToken } : apiKey ? { apiKey } : null
      );

      if (!payload) {
        return next(new where.ServerException(status.code401.number));
      }

      // scope
      const grantedScopes = payload.scp?.split(' ');

      //'@'
      if (!(grantedScopes && (grantedScopes.includes(scope) || grantedScopes.includes('*')))) {
        return next(new where.ServerException(status.code403.number));
      }

      req.user = payload;

    }

    next();

  };

  return middleware;

}

export { createPrecheck };
