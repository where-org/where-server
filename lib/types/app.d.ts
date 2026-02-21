import type * as Where from '@where-org/where-common';

// lib/app/resolve.js

export type AppResolve = (...args: string[]) => string;
export type AppResolveInit = (dir: string) => AppResolve;

// lib/app/sql.js

export type EscapeKey = <T>(key: T) => string;
export type EscapeValue = <T>(value: T) => string;

export type Escape = {
  key: EscapeKey, value: EscapeValue,
};

export type AppSqlParse = 
  (condition: Where.ConditionObject) => any[];

export type AppSqlSelect = 
  (table: string, condition: Where.ConditionObject, escape: Escape) => string;

export type AppSqlInsert = 
  (table: string, data: Where.DataArray, escape: Escape) => string;

export type AppSqlUpdate = 
  (table: string, data: Where.DataArray, condition: Where.ConditionObject, escape: Escape) => string;

export type AppSqlDelete = 
  (table: string, condition: Where.ConditionObject, escape: Escape) => string;

export type AppSqlWhere = (condition: any[], escape: Escape) => string;
export type AppSqlOrder = (condition: any[], escape: Escape) => string;
export type AppSqlLimit = (condition: any[], escape: Escape) => string;

// AppSql
export type AppSql = {

  parse: AppSqlParse,

  select: AppSqlSelect,
  insert: AppSqlInsert,
  update: AppSqlUpdate,
  delete: AppSqlDelete,

  where: AppSqlWhere,
  order: AppSqlOrder,
  limit: AppSqlLimit,

};

// lib/app/nosql.js

export type AppNosqlSelect = (condition: Where.ConditionObject) => {
  [key: string | number]: any,
};

export type AppNosqlInsert = AppNosqlSelect;
export type AppNosqlUpdate = AppNosqlSelect;
export type AppNosqlDelete = AppNosqlSelect;

export type AppNosqlProjection = (values: (string | number)[]) => {
  [key: string | number]: true,
};

export type AppNosqlWhere = <T, U>(values: T) => U;
export type AppNosqlOrder = <T, U>(values: T) => U;
export type AppNosqlLimit = <T, U>(values: T) => U;

export type AppNosql = {

  select: AppNosqlSelect,
  insert: AppNosqlInsert,
  update: AppNosqlUpdate,
  delete: AppNosqlDelete,

  projection: AppNosqlProjection,

  where: AppNosqlWhere,
  order: AppNosqlOrder,
  limit: AppNosqlLimit,

};

// lib/app/index.js

export type App = {
  resolve: AppResolve, sql: AppSql, nosql: AppNosql,
};
