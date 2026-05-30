const at = {

  '@me': async (config, where, ref, name, condition) => {
    return ref.user ? [ref.user] : [];
  },

  '@spec': async (config, where, ref, name, condition) => {

    const { grantedScopes = {} } = ref.user ?? {},
          grantedScopeKeys = Object.keys(grantedScopes);

    const spec = await where.common.spec.fromConfig(name, config.app[name].spec);

    if (!Object.keys(spec).length) {
      return [];
    }

    const { scope, ...rest } = spec;

    const res = [grantedScopeKeys.includes('*')
      ? spec
      : { ...rest, scope: scope.filter(v => v.name.startsWith('@') || grantedScopeKeys.includes(v.name)) }
    ];

    return await new Promise(r => r(where.da.filter(res, condition))).catch(err => {
      throw new where.ServerException(where.define.status.code404.number);
    });

  },

  '@schema': async (config, where, ref, name, condition) => {

    const [spec] = await at['@spec'](config, where, ref, name, null),
          res = spec && 'scope' in spec ? spec.scope.map(v => v.schema) : [];

    return await new Promise(r => r(where.da.filter(res, condition))).catch(err => {
      throw new where.ServerException(where.define.status.code404.number);
    });

  },

  '@condition': async (config, where, ref, name, condition) => {

    const [spec] = await at['@spec'](config, where, ref, name, null),
          res = spec && 'scope' in spec ? spec.scope.map(v => v.condition) : [];

    return await new Promise(r => r(where.da.filter(res, condition))).catch(err => {
      throw new where.ServerException(where.define.status.code404.number);
    });

  },

};

export { at };
