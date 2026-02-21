import type * as Where from '@where-org/where-common';
import type { ServerError } from './server.js';

// lib/app/index.js

import type { App } from './app.js';

// where-server-app-module

// parameters

// ServerAppRef
export type ServerAppRef = Where.DataObject;

// ServerAppScope
export type ServerAppScope = string;

// ServerAppFiles
export type ServerAppFile = {

  fieldname   : string,
  originalname: string,
  encoding    : string,
  mimetype    : string,
  destination : string,
  filename    : string,
  path        : string,
  size        : number,

};

// ServerAppFiles
export type ServerAppFiles = ServerAppFile[];

// interface

// ServerApp
export interface ServerApp {

  get?
    (ref: ServerAppRef, scope: ServerAppScope, condition?: Where.ConditionObject): Promise<Where.DataArray>;

  post?
    (ref: ServerAppRef, scope: ServerAppScope, data: Where.DataArray, files?: ServerAppFiles): Promise<Where.DataArray>;

  put?
    (ref: ServerAppRef, scope: ServerAppScope, data: Where.DataArray, condition: Where.ConditionObject, files?: ServerAppFiles): Promise<Where.DataArray>;

  delete?
    (ref: ServerAppRef, scope: ServerAppScope, condition: Where.ConditionObject): Promise<Where.DataArray>;

  end?
    (): Promise<void>;

}

// constructor parameters

// ServerAppConfig
export type ServerAppConfig = Where.Credentials;

// Env - where.env
export type Env<T = string | number> = Where.DataObject<T>;

// Common - where.common
export type Common = {

  file: Where.CommonFile,
  util: Where.CommonUtil,

};

// Cq - where.cq
export type Cq = {

  parse : Where.CqParse,
  string: Where.CqString,

};

// Da - where.da
export type Da = {
  filter: Where.DaFilter,
};

// ServerAppLib
export type ServerAppLib = {

  server: {error: ServerError},
  emit: Where.Emit,
  log: Where.Log,
  env: Env,
  app: App,

  common: Common,
  cq: Cq,
  da: Da,

  ConnectionException: typeof Where.ConnectionException,
  ServerException: typeof Where.ServerException,
  UrlException: typeof Where.UrlException,

};

// ServerAppDep
type Methods = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type ServerAppDep = ServerApp & {

  config: ServerAppConfig,

  exclude: (method: Methods[]) => boolean,

  once: Where.Once,
  on  : Where.On,
  off : Where.Off,

  [key: string]: any,

};

// ServerAppDepObject
export type ServerAppDepObject = {
  [key: string]: ServerAppDep,
};

// where-server-auth-module

//ServerAuthRef
//ServerAuthUser
//ServerAuthPassword
//ServerAuthOption
//ServerAuthExpandedData
//ServerAuthData

// ServerAuth
export interface ServerAuth {

  authenticate
    (ref: any, user: any, password: any, option: any, expandedData: any): Promise<any>;

  authorize
    (data: any): Promise<any>;

}

// shortcut

// parameters

//export type Ref   = ServerAppRef;
//export type Scope = ServerAppScope;
//export type File  = ServerAppFile;
//export type Files = ServerAppFiles;

// constructor parameters

 
//export type Lib       = ServerAppLib;
//export type Dep       = ServerAppDep;
//export type DepObject = ServerAppDepObject;
