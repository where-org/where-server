import path from 'node:path';

const app = async (config, where, dep) => {

  const { da, env } = where,
        { status } = where.define;

  const c = config.dump();

  const get = {

    apps: async (ref) => {

      const host = `${ref.protocol}://${ref.host}`,
            prefix = c.server.http.prefix.replace(/^\/(.*)\/?$/, '$1');

      const res = Object.entries(c.app).map(([k1, v]) => {

        const { url, spec } = c.server.api.version.reduce((o, k2) => {

          const url = { [k2]: [host, prefix, k2, k1].join('/') },
                spec = k2 !== 'v1' && v.spec ? { [k2]: [url[k2], '@spec'].join('/') } : {};

          return { url: { ...o.url, ...url }, spec: { ...o.spec, ...spec } };

        }, {});

        return { app: k1, url, ...(Object.keys(spec).length > 0 ? { spec } : {}) };

      });

      return res;

    },

    status: async (ref) => {

      const { SERVER_NAME: name, SERVER_VERSION: version, SERVER_MODE: mode } = env,
            total = Object.keys(c.app).length;

      const uptime = Math.floor(process.uptime()),
            memory = process.memoryUsage();

      const res = [{ name, version, mode, total, uptime, ...memory }];
      return res;

    },

  }

  const hook = { get };

  const app = {

    get: async (ref, scope, condition) => {

      try {

        const res = await hook.get[scope](ref);

        return await new Promise(r => r(da.filter(res, condition))).catch(err => {
          throw new where.ServerException(status.code404.number);
        });

      } catch(err) {

        console.log(err);
        if (err instanceof TypeError) {
          throw new where.ServerException(status.code404.number);
          return;
        }

        throw err;

      }

    },

  };

  return app;

};

export { app };
