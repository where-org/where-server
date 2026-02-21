import path from 'path';
import fs from 'fs/promises';

import multer from 'multer';
import { nanoid } from 'nanoid';

const unit = {
  b: 1, kb: 1000, mb: Math.pow(1000, 2), gb: Math.pow(1000, 3),
};

const upload = (tmpdir, limit, filesKey) => {

  const storage = multer.diskStorage({

    destination: tmpdir,

    filename: (req, file, cb) => {
      const [, ext] = file.originalname.split('.'),
            name = nanoid();

      cb(null, [name, ext].filter(v => v).join('.'));
    }
  });

  const [, i, k] = limit.toString().toLowerCase().match(/^([1-9][0-9]*)(.?b?)$/);

  const limits = {
    fileSize: (k) ? i * unit[k] : i
  };

  const files = multer({ storage, limits }).array(filesKey);

  return {

    middleware: async (req, res, next) => {
      files(req, res, next);
    },

    unlink: async(files) => {
      files.map((v) => fs.unlink(v.path, err => {}));
    }

  };

}

export { upload };
