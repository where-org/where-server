
const init = async (name, c, w, dep) => {

  // where
  const { init, ...common } = w.common;

  const log = init.log({ module: 'server-app', app: name }),
        { emit, ...on } = init.emitter();

  const where = { ...w, emit, log, common };

  // config
  const config = { ...c.app[name], token: c.token };

  const dump = config.app.module.indexOf('#module')
    ? {}
    : { dump: ((c) => () => c)(c) };

  // app
  const { module: appModule, group = name } = config.app;

  const appConfig = { ...config.app, ...dump, ...await init.credential(config.app, dep) };

  const appImport = await import(appModule),
        app = { ...await appImport[(appImport.app) ? 'app' : 'default'](appConfig, where, dep), ...on };

  if (config.auth == null || config.auth == undefined) {
    return { ...app, config: { auth: config.auth } };
  }

  // auth
  const { module: authModule, meta, mfa, ...rest } = config.auth,
        { through = [], expiresIn = '5m', refreshExpiresIn = '1d', defaultScope = ['*'] } = meta;

  const credential = rest[meta.credential || 'credential'];

  if (!credential) {
    throw new Error('Credential not configured');
  }

  const authConfig = { defaultScope, credential };

  const authImport = authModule ? await import(authModule) : null,
        auth = await authImport[(authImport.auth) ? 'auth' : 'default'](authConfig, where, app);

  const authMetaConfig = {
    mfa, through, expiresIn, refreshExpiresIn, defaultScope, ...meta,

    secret: [name, meta.secret || ''].join('-'),
  };

  return { ...app, ...auth, config: { auth: authMetaConfig } };

};

// wrapper
const wrapper = async (config, where) => {

  return await Object.entries(config.app).reduce(async (o1, [k, v]) => {

    const o = await o1;

    const dep = !v.dep ? null : Object.entries(v.dep).reduce((o2, [k, v]) => {
      return { ...o2, [k]: o[v] };
    }, {});

    const app = { ...o, [k]: await init(k, config, where, dep) };

    return app;

  }, {});

}

export { wrapper as init };
