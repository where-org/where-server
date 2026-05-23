const init = async (name, c, where, dep) => {

  // where
  const { app: a1, auth: a2, ...rest } = where,
        { init, ...common } = where.common;

  const { emit, ...on } = init.emitter();

  const w = {

    app: {
      ...rest, emit, common, app: a1, log: init.log({ module: 'server-app', app: name, }), 
    },

    auth: {
      ...rest, auth: a2, log: init.log({ module: 'server-auth', app: name, }), 
    },

  };

  // config
  const config = c.app[name];

  const dump = config.app.module.startsWith('#module')
    ? { dump: (c => () => c)(c) }
    : {};

  // namespace
  //const { namespace = name } = config.app;

  // app
  const appConfig = { ...config.app, ...dump, ...await init.credential(config.app) };

  const appImport = await import(config.app.importPath),
        app = { ...await appImport['app' in appImport ? 'app' : 'default'](appConfig, w.app, dep), ...on };

  if (config.auth === null || config.auth === undefined) {
    return app;
  }

  // auth
  const authConfig = { ...config.auth, ...await init.credential(config.auth) };

  const authImport = await import(config.auth.importPath),
        auth = await authImport[(authImport.auth) ? 'auth' : 'default'](authConfig, w.auth, app);

  return { ...app, ...auth };

};

// wrapper
const wrapper = async (config, where) => {

  return Object.entries(config.app).reduce(async (o, [k, v]) => {

    const apps = await o;

    const dep = v.dep
      ? Object.fromEntries(Object.entries(v.dep).map(([k, v]) => [k, apps[v]]))
      : null;

    apps[k] = await init(k, config, where, dep);
    return apps;

  }, Promise.resolve({}));

};

export { wrapper as init };
