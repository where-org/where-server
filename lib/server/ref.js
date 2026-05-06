const keys = ['user', 'ip', 'protocol', 'originalUrl', { headers: ['host'] }];

const createRef = (req, res) => {

  return { ...res.locals, ...keys.reduce((o, k) => {

    const v = (typeof k === 'string') ? {[k]: req[k]} : Object.entries(k).reduce((o, [k1, k2]) => {
      return { ...o, ...k2.reduce((o, k3) => ({ ...o, [k3]: req[k1][k3] }), {}) };
    }, {});

    return { ...o, ...v };

  }, {}) };

}

export { createRef };
