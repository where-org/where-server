const at = {

  '@spec': async (config, where, name, condition) => {

    const spec = await where.common.spec.fromConfig(name, config.app[name].spec),
          res = Object.keys(spec).length > 0 ? [spec] : [];

    return await new Promise(r => r(where.da.filter(res, condition))).catch(err => {
      throw new where.ServerException(where.define.status.code404.number);
    });

  },

  '@schema': async (config, where, name, condition) => {

    const [spec] = await at['@spec'](config, where, name, null),
          res = spec && 'scope' in spec ? spec.scope.map(v => v.schema) : [];

    return await new Promise(r => r(where.da.filter(res, condition))).catch(err => {
      throw new where.ServerException(where.define.status.code404.number);
    });

  },

  '@condition': async (config, where, name, condition) => {

    const [spec] = await at['@spec'](config, where, name, null),
          res = spec && 'scope' in spec ? spec.scope.map(v => v.condition) : [];

    return await new Promise(r => r(where.da.filter(res, condition))).catch(err => {
      throw new where.ServerException(where.define.status.code404.number);
    });

  },

};

export { at };
