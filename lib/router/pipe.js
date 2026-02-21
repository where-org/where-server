/*
todo: register関数で登録出来るようにする
*/
const pipe = {

  camel: async (where, res, condition) => {
    return where.common.util.casing.keysToCamel(res);
  },

  snake: async (where, res, condition) => {
    return where.common.util.casing.keysToSnake(res);
  },

  kebab: async (where, res, condition) => {
    return where.common.util.casing.keysToKebab(res);
  },

  upper: async (where, res, condition) => {

    return res.map(v => {

      return Object.entries(v).reduce((o, [k, v]) => {
        return { ...o, [k.toUpperCase()]: v };
      }, {});

    });

  },

};

export { pipe };
