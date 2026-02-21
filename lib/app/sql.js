import { da } from '@where-org/where-common';

const operators = {

  '=': (k, v) => {

    const [first] = v,
          v1 = (!first) ? '' : (first.toLowerCase) ? first.toLowerCase() : String(first);

    const isNull = {
      'null': 'NULL', "'null'": 'NULL', 'not-null': 'NOT NULL', "'not-null'": 'NOT NULL',
    };

    if (Object.keys(isNull).includes(v1)) {
      const sv = isNull[v1];
      return `${k} IS ${sv}`;

    } else {
      const sv = v.join();
      return `${k} IN (${sv})`;
    }
  },

  '!': (k, v) => {
    const [first] = v,
          v1 = (!first) ? '' : (first.toLowerCase) ? first.toLowerCase() : String(first);

    const isNull = {
      'null': 'NOT NULL', "'null'": 'NOT NULL', 'not-null': 'NULL', "'not-null'": 'NULL',
    };

    if (Object.keys(isNull).includes(v1)) {
      const sv = isNull[v1];
      return `${k} IS ${sv}`;

    } else {
      const sv = v.join();
      return `${k} NOT IN (${sv})`;
    }

  },

  '<': (k, v) => {
    const [v1] = v;
    return `${k} < ${v1}`;
  },

  '>': (k, v) => {
    const [v1] = v;
    return `${k} > ${v1}`;
  },

  '<=': (k, v) => {
    const [v1] = v;
    return `${k} <= ${v1}`;
  },

  '>=': (k, v) => {
    const [v1] = v;
    return `${k} >= ${v1}`;
  },

  '-': (k, v) => {
    const [v1, v2] = v;
    return `${k} BETWEEN ${v1} AND ${v2}`;
  },

  '*': (k, v) => {
    const v1 = v[0].replace(/\*/g, '%');
    return `${k} LIKE ${v1}`;
  },

  '!*': (k, v) => {
    const v1 = v[0].replace(/\*/g, '%');
    return `${k} NOT LIKE ${v1}`;
  },

};

// split
const split = da.split(Object.keys(operators));

// sql
const sql = {

  condition: {

    parse: (condition) => {

      const insert = (object, separator) => {

        return object.reduce((o, [k, v]) => {

          return [...o, (Array.isArray(v)) ? [k, ...v] : [k, v], separator];

        }, []).filter((v, i, o) => {
          return i < o.length - 1;
        });

      };

      return Object.entries(condition).map(([k, v]) => {

        const values = !('or' in v) ? insert(Object.entries(v), ':') : v.or.map((v) => {
          return insert(Object.entries(v), ':');

        }).reduce((o, v) => {
          return [...o, ...v, '|'];

        }, []).filter((v, i, o) => {
          return i < o.length - 1;
        });

        return [k, values];

      });

    },

    where: (condition, escape) => {

      const join = { ':': 'AND', '|': 'OR' },
            r1 = /^(:|\|)$/;

      const values = condition.map(v => {

        if (v.match && v.match(r1)) {
          return join[v.match(r1)[0]];
        }

        const [key, ...rawValues] = v,
              escapeValues = rawValues.map((v) => escape.value(v));

        const [k, op] = split(key);

        return operators[op](escape.key(k), escapeValues);

      }).join(' ');

      return ` WHERE ${values}`;

    },

    order: (condition, escape) => {

      const kv = condition.filter(v => Array.isArray(v));

      const values = kv.map(v => {

        const [key, value] = v;

        const escapeKey = escape.key(key),
              escapeValue = (value.toUpperCase() == 'DESC') ? 'DESC' : 'ASC';

        return `${escapeKey} ${escapeValue}`;

      }).join(',');

      return ` ORDER BY ${values}`;
    },

    limit: (condition, escape) => {

      const kv = condition.filter(v => Array.isArray(v) && !isNaN(v[1]));

      if (!('limit' in Object.fromEntries(kv))) {
        return '';
      }

      const sorted = [...kv].sort((a, b) => {

        const order = ['limit', 'offset'];
        return order.indexOf(a[0]) - order.indexOf(b[0]);

      });

      return sorted.map(v => ` ${v[0].toUpperCase()} ${v[1]}`).join('');

    },

  },

  select: (table, condition, escape) => {

    const reserve = {
      count: 'count(*) as count',
      '*': '*'
    };

    const escapeTable = escape.key(table),
          { select: s = ['*'], where, order, limit } = condition || {};

    const select = s.map(k => reserve[k] ? reserve[k] : escape.key(k)).join(',');

    const q = `SELECT ${select} FROM ${escapeTable}`;

    if (!condition) {
      return `${q};`;
    }

    const [w, o, l] = Object.entries({ where, order, limit }).map(([k, v]) => {
      return v ? { [k]: v } : {};
    });

    return [...(sql.condition.parse({ ...w, ...o, ...l }).reduce(

      (o, [k, v]) => [...o, sql.condition[k](v, escape)], [q])

    ), ';'].join('');

  },

  insert: (table, data, escape) => {

    const escapeTable = escape.key(table),
          [first] = data;

    const keys = Object.keys(first),
          values = data.map((v) => (Object.values(v)));

    const escapeKeys = keys.map((v) => escape.key(v)).join(',');

    const escapeValues = values.map((v) => {
      const escapeRowValues = v.map((v) => escape.value(v)).join(',');
      return `(${escapeRowValues})`;
    }).join(',');

    const q = `INSERT INTO ${escapeTable}(${escapeKeys}) VALUES ${escapeValues};`;
    return q;

  },

  update: (table, data, condition, escape) => {

    const escapeTable = escape.key(table),
          [first] = data;

    const values = Object.entries(first).map(([k, v]) => {

      const [escapeKey, escapeValue] = [escape.key(k), escape.value(v)];
      return `${escapeKey}=${escapeValue}`;

    }).join(',');

    const q = `UPDATE ${escapeTable} SET ${values}`;

    if (!condition) {
      return `${q};`;
    }

    // where dake (select, order, limit ha mushi shimasu)
    const { where = {} } = condition;

    return [...(sql.condition.parse({where}).reduce(
      (o, [k, v]) => [...o, sql.condition[k](v, escape)], [q])
    ), ';'].join('');

  },

  delete: (table, condition, escape) => {

    const escapeTable = escape.key(table),
          q = `DELETE FROM ${escapeTable}`;

    if (!condition) {
      return `${q};`;
    }

    // where dake (select, order, limit ha mushi shimasu)
    const { where = {} } = condition;

    return [...(sql.condition.parse({where}).reduce(
      (o, [k, v]) => [...o, sql.condition[k](v, escape)], [q])
    ), ';'].join('');

  },

};

export { sql };
