const keys = ['user', 'ip', 'protocol', 'originalUrl', { headers: ['host'] }];

const createRef = (req, res) => {

  return { ...res.locals, ...Object.fromEntries(

    keys.flatMap(k => typeof k === 'string'
      ? [[k, req[k]]]
      : Object.entries(k).flatMap(([k1, k2]) => k2.map(k3 => [k3, req[k1]?.[k3]]))
    )

  )};

};


export { createRef };
