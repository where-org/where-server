import { da } from '@where-org/where-common';

const operators = {

  '=': (k, v) => {
    const [first] = v,
          v1 = (!first) ? '' : (first.toLowerCase) ? first.toLowerCase() : String(first);

    const isNull = {
      'null' : { [k]: null }, 'not-null': { [k]: { '$ne': null } }
    };

    if (Object.keys(isNull).includes(v1)) {
      return {'$and': [{ [k]: {'$exists': true} }, isNull[v1]] };
    } else {
      return { [k]: { '$in': v } };
    }

  },

  '!': (k, v) => {
    const [first] = v,
          v1 = (first.toLowerCase) ? first.toLowerCase() : String(first);

    const isNull = {
      'null': { [k]: { '$ne': null } }, 'not-null' : { [k]: null }
    };

    if (Object.keys(isNull).includes(v1)) {
      return { '$and': [{ [k]: { '$exists': true } }, isNull[v1]] };
    } else {
      return { [k]: { '$nin': v } };
    }
  },

  '<': (k, v) => {
    const [v1] = v;
    return { [k]: { '$lt': v1 } };
  },

  '>': (k, v) => {
    const [v1] = v;
    return { [k]: { '$gt': v1 } };
  },

  '<=':(k, v) => {
    const [v1] = v;
    return { [k]: { '$lte': v1 } };
  },

  '>=': (k, v) => {
    const [v1] = v;
    return { [k]: { '$gte': v1 } };
  },

  '-': (k, v) => {
    const [v1, v2] = v;
    return { [k]: { '$gte': v1, '$lte': v2 } };
  },

  '*': (k, v) => {

    const [v1] = v;

    const value = new RegExp(v1.replace(/\*(.+)\*/, '$1').
        replace(/^(.+)\*$/, '^$1').replace(/^\*(.+)$/, '$1$').replace(/\*/, '.+'));

    return { [k]: value };

  },

  '!*': (k, v) => {

    const [v1] = v;

    const value = new RegExp(v1.replace(/\*(.+)\*/, '$1').
        replace(/^(.+)\*$/, '^$1').replace(/^\*(.+)$/, '$1$').replace(/\*/, '.+'));

    return { [k]: { '$not': value } };

  },

};

// split
const split = da.split(Object.keys(operators));

// nosql
const nosql = {

  condition: {

    where: (values) => {

      return {'$or': ((values.or) ? values.or : [values]).map((v) => {

        return { '$and': Object.entries(v).map(([ak, av]) => {
          const [k, op] = split(ak);
          return operators[op](k, Array.isArray(av) ? av : [av]);
        }) };

      })};

    },

    order: (values) => {
      return Object.entries(values).reduce((o, [k, v]) => {
        return { ...o, [k]: (v.toUpperCase() == 'DESC') ? -1 : 1 };
      }, {});
    },

    limit: (values) => {

      if (!('limit' in values)) {
        return null;
      }

      const { offset: skip = 0, limit } = values;
      return { skip, limit };

    },
  },

  select: (condition) => {

    if (!condition) {
      return {};
    }

    const { select: s, ...wol } = condition || {},
          select = (!s) ? {} : { projection: s };

    const q = Object.entries({ ...select, ...wol }).reduce((o, [k, v]) => {

      const values = nosql.condition[k](v);
      return values ? { ...o, [k]: values } : o;

    }, {});

    return q;

  },

  insert: (condition) => {
    return nosql.select(condition);
  },

  update: (condition) => {
    return nosql.select(condition);
  },

  delete: (condition) => {
    return nosql.select(condition);
  },

  projection: (values) => {

    if (values.includes('*')) {
      return;
    }

    return values.reduce((o, k) => ({ ...o, [k]: true }), {});
  },

};

export { nosql };
