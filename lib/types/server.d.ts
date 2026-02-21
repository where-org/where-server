import type * as Where from '@where-org/where-common';
import type { Express } from 'express';

// lib/server/error.js

// 400
export type ServerErrorStatus400 = {code: 400, message: 'Bad Request'};
export type ServerErrorStatus401 = {code: 401, message: 'Unauthorized'};
export type ServerErrorStatus403 = {code: 403, message: 'Forbidden'};
export type ServerErrorStatus404 = {code: 404, message: 'Not Found'};
export type ServerErrorStatus405 = {code: 405, message: 'Method Not Allowed'};
export type ServerErrorStatus413 = {code: 413, message: 'Payload Too Large'};
export type ServerErrorStatus418 = {code: 418, message: "I'm a teapot"};
export type ServerErrorStatus451 = {code: 451, message: 'Unavailable For Legal Reasons'};

// 500
export type ServerErrorStatus500 = {code: 500, message: 'Internal Server Error'};
export type ServerErrorStatus501 = {code: 501, message: 'Not Implemented'};
export type ServerErrorStatus502 = {code: 502, message: 'Bad Gateway'};
export type ServerErrorStatus503 = {code: 503, message: 'Service Unavailable'};
export type ServerErrorStatus504 = {code: 504, message: 'Gateway Timeout'};

export type ServerErrorType = {
  'entity.too.large': 413
};

export type ServerErrorCode = {
  'LIMIT_FILE_SIZE': 413
};

export type ServerError = {
  // 400
  status400: ServerErrorStatus400,
  status401: ServerErrorStatus401,
  status403: ServerErrorStatus403,
  status404: ServerErrorStatus404,
  status405: ServerErrorStatus405,
  status413: ServerErrorStatus413,

  // 500
  status500: ServerErrorStatus500,
  status501: ServerErrorStatus501,
  status502: ServerErrorStatus502,
  status503: ServerErrorStatus503,
  status504: ServerErrorStatus504,
  // error
  type: ServerErrorType,
  code: ServerErrorCode,
};

// lib/server.js 

export type Server = Express;
export type ServerInit = (dir: string) => Promise<Server>;

// const

export declare const server: ServerInit;
export declare const log: Where.Log;
