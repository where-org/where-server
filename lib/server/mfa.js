import twofactor from 'node-2fa';

const mfa = {

  generate: (issuer, name) => {
    const { secret, uri } = twofactor.generateSecret({ name: issuer, account: name });
    return { secret, uri };
  },

  verify: (secret, token) => {
    const { delta } = twofactor.verifyToken(secret, token) || {};
    return (delta === 0) ? true : false;
  }

};

export { mfa };
