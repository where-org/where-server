const expanded = {

  // authenticate 
  authenticate: async (user, config, app) => {
  
    const { table, keyColumn, userColumn } = config,
          { scopeColumn = 'scope', limitedColumn = 'limited' } = config;
  
    const [res] = await app.get(table, {
      where: {
        or: [
          { [keyColumn]: user },
          { [userColumn]: user },
        ],
      },
    }).catch(err => {
      ;;; console.log({ error: err.message });
      return [];
    });
  
    if (!res) {
      return false;
    }
  
    const { [scopeColumn]: rawScope } = res,
          scope = (!rawScope) ? [] : (typeof rawScope === 'string') ? rawScope.split(',') : rawScope;
  
    const { [limitedColumn]: rawLimited } = res,
          limited = (!rawLimited) ? null : (typeof rawLimited === 'string') ? rawLimited.split(',') : rawLimited;
  
    const data = {
      ...res, scope, limited,
    };
  
    return [(res && res[keyColumn]) ? res[keyColumn] : user, data];
  },

  // authorize
  authorize: async (user, config, app) => {
  
    const { table, keyColumn } = config,
          { scopeColumn = 'scope', limitedColumn = 'limited' } = config;
  
    const [res] = await app.get(table, { where: { [keyColumn]: user } }).catch(err => {
      ;;; console.log({ error: err.message });
      return [];
    });
  
    if (!res) {
      return false;
    }
  
    const { [scopeColumn]: rawScope } = res,
          scope = (!rawScope) ? [] : (typeof rawScope === 'string') ? rawScope.split(',') : rawScope;
  
    const { [limitedColumn]: rawLimited } = res,
          limited = (!rawLimited) ? null : (typeof rawLimited === 'string') ? rawLimited.split(',') : rawLimited;
  
    return { ...res, scope, limited };
  }
};

export { expanded };
