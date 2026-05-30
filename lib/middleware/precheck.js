const level = { read: 0, write: 1 };

const methodsByAction = {
  read : ['GET', 'HEAD', 'OPTIONS'],
  write: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
};

const wwwAuthenticate = 'WWW-Authenticate',
      realm = 'where-api';

/* createPrecheck */
const createPrecheck = (config, where, app) => {

  const { status } = where.define,
        { createRef } = where.server;

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

    // auth 
    if (config.app[name].auth !== null) {

      const requestBearer = bearer === 'Bearer' && accessToken,
            requestApiKey = xApiKey === 'whr' && apiKey;

      if (requestBearer && requestApiKey) {
        const additionalHeaders = {
          [wwwAuthenticate]: `Bearer realm="${realm}", error="invalid_request", error_description="Multiple authentication methods in a single request"`,
        };
        return next(new where.ServerException(status.code400.number, null, { additionalHeaders }));
      }

      if (!requestBearer && !requestApiKey) {
        const additionalHeaders = { [wwwAuthenticate]: `Bearer realm="${realm}"` };
        return next(new where.ServerException(status.code401.number, null, { additionalHeaders }));
      }

      // verify
      if ('verify' in app[name]) {

        const ref = createRef(req, res),
              action = methodsByAction.read.includes(req.method) ? 'read' : 'write';

        const atScope = scope.startsWith('@');

        const token = accessToken
          ? { bearer: accessToken }
          : apiKey ? { apiKey: req.headers['x-api-key'] } : {};

        const payload = await app[name].verify(ref, token);

        if (!payload) {

          if ('bearer' in token) {
            const additionalHeaders = {
              [wwwAuthenticate]: `Bearer realm="${realm}", error="invalid_token", error_description="The access token is invalid or expired"`,
            };
            return next(new where.ServerException(status.code401.number, null, { additionalHeaders }));
          }

          return next(new where.ServerException(status.code403.number));

        }

        if (!(payload.scp || atScope)) {

          if ('bearer' in token) {
            const additionalHeaders = {
              [wwwAuthenticate]: `Bearer realm="${realm}", error="insufficient_scope", scope="${scope}:${action}"`,
            };
            return next(new where.ServerException(status.code403.number, null, { additionalHeaders }));
          }

          return next(new where.ServerException(status.code403.number));

        }

        // grantedScope
        const grantedScopeEntries = (payload.scp ?? '').split(' ')
          .map(v => v.split(':')).filter(([k, v]) => v && v in level);

        const grantedScopes = Object.fromEntries(
          grantedScopeEntries.toSorted(([, a], [, b]) => level[a] - level[b])
        );

        if (!(scope in grantedScopes || Object.keys(grantedScopes).includes('*') || atScope)) {

          if ('bearer' in token) {
            const additionalHeaders = {
              [wwwAuthenticate]: `Bearer realm="${realm}", error="insufficient_scope", scope="${scope}:${action}"`,
            };
            return next(new where.ServerException(status.code403.number, null, { additionalHeaders }));
          }

          return next(new where.ServerException(status.code403.number));

        }

        if (!(methodsByAction[grantedScopes[scope] ?? grantedScopes['*']]?.includes(req.method) || atScope)) {

          if ('bearer' in token) {
            const additionalHeaders = {
              [wwwAuthenticate]: `Bearer realm="${realm}", error="insufficient_scope", scope="${scope}:${action}"`,
            };
            return next(new where.ServerException(status.code403.number, null, { additionalHeaders }));
          }

          return next(new where.ServerException(status.code403.number));

        }
        // auth-module not null req.user
        req.user = { ...payload, grantedScopes };

      }

    } else {
      // auth-module null req.user
      req.user = { grantedScopes: { '*': 'write' } };
    }

    next();

  };

  return middleware;

}

export { createPrecheck };
