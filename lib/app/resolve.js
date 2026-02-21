import path from 'node:path';

const resolve = dir => (...args) => path.resolve(dir, ...args);

export { resolve };
