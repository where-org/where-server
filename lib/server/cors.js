const cors = (cors) => {

  return {
    middleware: async (req, res, next) => {

      const origin = req.headers.origin || '';

      if (origin === '' || !cors.origin.includes(origin) && !cors.origin.includes('*')) {
        return next();
      }

      res.header('Access-Control-Allow-Origin' , origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, Authorization, Accept, Content-Type, X-Requested-With');

      return next();

    },
  };

}

export { cors };
