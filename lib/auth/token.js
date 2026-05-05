import crypto from 'node:crypto';
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';

/* parameters */

const header = { alg: 'HS256', typ: 'JWT' };

const usage = {
  accessToken: 'access', refreshToken: 'refresh',
};

/* helper */
const deriveKey = async (secret, usage) => {

  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), 'HKDF', false, ['deriveBits']
  );

  const algorithm = {
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new Uint8Array(32),
    info: new TextEncoder().encode(usage),
  };

  const bits = await crypto.subtle.deriveBits(algorithm, keyMaterial, 256);
  return new Uint8Array(bits);

};

const verify =  async (token, usage, jwks, secret, issuer, audience = ' ') => {

  const key = jwks ?? await deriveKey(secret, usage),
        { payload } = await jwtVerify(token, key, { issuer, audience });

  return payload;

};

/* token */
const token = {

  payload: (sub, scp, option) => {

    return { sub, scp, ...Object.entries(option).filter(
      ([k, v]) => v).reduce((o, [k, v]) => ({ ...o, [k]: v }), {})
    };

  },

  sign: async (payload, { secret, expiresIn, refreshExpiresIn, issuer, audience }) => {

    // accessToken
    const accessKey = await deriveKey(secret, usage.accessToken);

    const accessToken = await new SignJWT(payload).
      setProtectedHeader(header).setIssuer(issuer).
      setAudience(audience).setIssuedAt().setExpirationTime(expiresIn).sign(accessKey);

    // refreshToken
    const refreshKey = await deriveKey(secret, usage.refreshToken);

    const refreshToken = await new SignJWT({ sub: payload.sub }).
      setProtectedHeader(header).setIssuer(issuer).
      setAudience(audience).setIssuedAt().setExpirationTime(refreshExpiresIn).sign(refreshKey);

    return { accessToken, refreshToken };

  },

  createJWKS: async (jwksUri) => {
    return createRemoteJWKSet(new URL(jwksUri));
  },

  verifyAccessToken: async (token, { jwks, secret, issuer, audience = ' ' }) => {
    return await verify(token, usage.accessToken, jwks, secret, issuer, audience);
  },

  verifyRefreshToken: async (token, { jwks, secret, issuer, audience = ' ' }) => {
    return await verify(token, usage.refreshToken, jwks, secret, issuer, audience);
  },

};

export { token };
