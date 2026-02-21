const app = async (config, where, dep) => {

  const { da, env } = where;

  const { status } = where.define,
        { spec } = where.common;

  const c = config.dump();

  const specDefinedApps = Object.entries(c.app).filter(([, v]) => (
    v.spec && v.app.module !== `#module/where-server-app-documents`
  ));

  const get = {

    apps: async (ref) => {

      return await Promise.all(specDefinedApps.map(async ([k, v]) => {
        return { app: k, ...(await spec.fromConfig(k, v.spec)) };
      }));

    },

  };

  const hook = { get };

  const app = {

    get: async (ref, scope, condition) => {

      try {
        const res = await hook.get[scope](ref);

        return await new Promise(r => r(da.filter(res, condition))).catch(err => {
          throw new where.ServerException(status.code404.number);
        });

      } catch(err) {
        ;;; where.log(err.message);

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
