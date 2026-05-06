import multer from 'multer';
import { randomBytes } from 'node:crypto';

const unit = {
  b: 1, kb: 1000, mb: Math.pow(1000, 2), gb: Math.pow(1000, 3),
};

const createUpload = (tmpdir, limit, filesKey) => {

  const storage = multer.diskStorage({

    destination: tmpdir,

    filename: (req, file, cb) => {
      const [, ext] = file.originalname.split('.'),
            name = randomBytes(16).toString('base64url');

      cb(null, [name, ext].filter(v => v).join('.'));
    }
  });

  const [, i, k] = limit.toString().toLowerCase().match(/^([1-9][0-9]*)(.?b?)$/);

  const limits = {
    fileSize: (k) ? i * unit[k] : i
  };

  const files = multer({ storage, limits }).array(filesKey);

  const middleware = async (req, res, next) => {
    files(req, res, next);
  };

  return middleware;

}

export { createUpload };
