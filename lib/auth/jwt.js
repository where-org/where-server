import crypto from 'node:crypto';
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';

/* parameters */

const symmetricAlgorithms = {
  HS256: { hash: 'SHA-256', length: 256, minSecretBytes: 32 },
  HS384: { hash: 'SHA-384', length: 384, minSecretBytes: 48 },
  HS512: { hash: 'SHA-512', length: 512, minSecretBytes: 64 },
};

const defaultAlgorithm = 'HS256';

/* jwt */

const jwt = {

  deriveKey: async (secret, usage, algorithm = defaultAlgorithm) => {

    const { [algorithm]: spec } = symmetricAlgorithms;

    if (!spec) {
      throw new Error(`unsupported algorithm: ${algorithm}`);
    }

    const { hash, length, minSecretBytes } = spec,
          secretBytes = new TextEncoder().encode(secret);

    if (secretBytes.length < minSecretBytes) {
      throw new Error(
        `secret must be at least ${minSecretBytes} bytes for ${algorithm} (got ${secretBytes.length} bytes)`
      );
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw', secretBytes, 'HKDF', false, ['deriveKey']
    );

    const hkdfAlgorithm = {
      name: 'HKDF', hash, salt: new Uint8Array(32), info: new TextEncoder().encode(usage),
    };

    const key = await crypto.subtle.deriveKey(
      hkdfAlgorithm, keyMaterial, { name: 'HMAC', hash, length }, false, ['sign', 'verify']
    );

    return key;

  },

  createJWKS: async (jwksUri) => {
    return createRemoteJWKSet(new URL(jwksUri));
  },

  payload: (sub, scp, option = {}) => {
    return { sub, scp,
      ...Object.fromEntries(Object.entries(option).filter(([, v]) => v))
    };
  },

  sign: async (payload, keys, { expiresIn, refreshExpiresIn, issuer, audience, algorithm = defaultAlgorithm }) => {

    if (!symmetricAlgorithms[algorithm]) {
      throw new Error(`unsupported algorithm: ${algorithm}`);
    }

    const header = { alg: algorithm, typ: 'JWT' },
          { accessKey, refreshKey } = keys;

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader(header).setIssuer(issuer)
      .setAudience(audience).setIssuedAt().setExpirationTime(expiresIn).sign(accessKey);

    const refreshToken = await new SignJWT({ sub: payload.sub })
      .setProtectedHeader(header).setIssuer(issuer)
      .setAudience(audience).setIssuedAt().setExpirationTime(refreshExpiresIn).sign(refreshKey);

    return { accessToken, refreshToken };

  },

  verify: async (token, key, { issuer, audience, algorithms }) => {

    const missing = Object.entries({ key, issuer, audience, algorithms }).filter(([, v]) => !v).map(([k]) => k);

    if (missing.length > 0) {
      throw new Error(`missing required arguments: ${missing.join(', ')}`);
    }

    const { payload } = await jwtVerify(token, key, { issuer, audience, algorithms }).catch(err => {
      throw new Error(`JWT verification failed: ${err.message}`, { cause: err });
    });

    return payload;

  },

};

export { jwt };
