import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const salt = (secret, algorithm) => {
  return crypto.createHash(algorithm).update(secret).digest('hex');
}

const token = async (config, where, app) => {

  // { mode } = config; // symmetric | rsa | ec | eddsa

  const { issuer, audience: signAudience = [] } = config;

  const { status } = where.define;

  const token = {

    payload: (sub, scp, option) => {

      return { sub, scp, ...Object.entries(option).filter(
        ([k, v]) => v).reduce((o, [k, v]) => ({ ...o, [k]: v }), {})
      };

    },

    sign: async (secret, payload, expiresIn, refreshExpiresIn) => {

      const header = { alg: 'HS256', typ: 'JWT' },
            hash = 'sha256';

      const accessKey = new TextEncoder().encode(salt(secret, hash));

      const accessToken = await new SignJWT(payload).setProtectedHeader(header).setIssuer(issuer).
          setAudience(signAudience).setIssuedAt().setExpirationTime(expiresIn).sign(accessKey);

      const refreshKey = new TextEncoder().encode(salt(accessToken, hash));

      const refreshToken = await new SignJWT(payload).setProtectedHeader(header).setIssuer(issuer).
          setAudience(signAudience).setIssuedAt().setExpirationTime(refreshExpiresIn).sign(refreshKey);

      const { exp } = await token.verify(secret, accessToken, issuer, signAudience);
      return { accessToken, refreshToken, expiresIn: exp };

    },

    verify: async (secret, tokenString, verifyIssuer, verifyAudience = ' ') => {

      const key = new TextEncoder().encode(salt(secret, 'sha256'));

      try {

        const { payload } = await jwtVerify(tokenString, key, {
          issuer: verifyIssuer || issuer, audience: verifyAudience
        });

        return payload;

      } catch(err) {
        return false;
      }

    },

    middleware: async (req, res, next) => {

      const { name, scope } = req.params;

      // no app
      // アップがなければリジェクト
      // ルーターで対応
      if (!(name in app)) {
        return next(new where.ServerException(status.code404.number));
      }

      const { auth: authConfig } = app[name].config;

      // auth is null 
      // authがnul（認証スルーだったらパス）
      // ルーターで対応
      if (authConfig === null) {
        return next();
      }

      // auth is undefined
      // authが未定義ならリジェクト
      // ルーターで対応
      if (authConfig === undefined) {
        return next(new where.ServerException(status.code403.number));
      }

      // through and defaultScope
      // scopeがデフォルトスコープに合致すればパス
      // defaultScope、throughを削除する。必要ならモジュールで対応
      if (authConfig.through.includes(req.method.toUpperCase())) {

        const { defaultScope } = authConfig;

        if (defaultScope.includes(scope) || defaultScope.includes('*')) {
          return next();
        }

      }

      // bearer

      const [bearer, accessToken] = (req.headers['authorization'] || '').split(' ');

      // header
      // ヘッダーがないならリジェクト
      // ルーター対応
      if (!('authorization' in req.headers) || bearer !== 'Bearer') {
        return next(new where.ServerException(status.code401.number));
      }

      // verify
      const { secret, issuer, audience, userData } = authConfig,
            verify = await token.verify(secret, accessToken, issuer, audience);

      // アクセストークンが無効ならリジェクト
      // モジュールで対応
      if (!verify) {
        return next(new where.ServerException(status.code401.number));
      }

      // スコープ権限がないならリジェクト
      // モジュールで対応
      if (!verify.scp.includes(scope) && !verify.scp.includes('*')) {
        return next(new where.ServerException(status.code403.number));
      }

      // userData
      // モジュールでセット
      if (userData) {
        req.user = Object.entries(userData).reduce(
          (o, [k1, k2]) => (verify[k1] ? { ...o, [k2]: verify[k1] } : o), {}
        );
      }

      return next();

    },

  };

  return token;

}

export { token };
