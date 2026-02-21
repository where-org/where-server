import path from 'node:path';
import { fileURLToPath } from 'node:url';

const config = {

  load: async (common, dir, mode, name, ignore = null) => {

    const { app, spec, server } = await common.config.load(dir, mode, name, ignore);

    const mergedAppConfig = await Object.entries(app).reduce(async (o, [k, v]) => {

      if (k in spec) {
        const { description, scope } = spec[k];
        return { ...await o, [k]: { ...v, spec: {description, scope } } };
      }

      const packageConfigPath = path.join(
        path.dirname(fileURLToPath(import.meta.resolve(v.app.module))), 'config'
      );

      const moduleSpec = await common.config.resolve(packageConfigPath, 'module-spec').catch(err => undefined);

      if (!moduleSpec) {
        return { ...await o, [k]: v };
      }

      const { description, scope } = moduleSpec;
      return { ...await o, [k]: { ...v, spec: { description, scope } } };

    }, {});

    return { server, app: mergedAppConfig };

  }

};

export { config };
