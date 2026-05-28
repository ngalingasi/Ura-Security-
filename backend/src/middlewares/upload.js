const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const ALLOWED_IMAGES = ['image/jpeg','image/jpg','image/png','image/webp'];
const ALLOWED_DOCS   = ['image/jpeg','image/jpg','image/png','image/webp',
                         'application/pdf',
                         'application/msword',
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const makeStorage = (subdir) => {
  const dir = path.join(process.cwd(), 'uploads', subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename:    (_req,  file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${subdir.replace('/', '_')}_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;
      cb(null, name);
    },
  });
};

const makeMiddleware = (storage, mimetypes, maxMB, field) => {
  const upload = multer({
    storage,
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (mimetypes.includes(file.mimetype)) cb(null, true);
      else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    },
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError)
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      if (err)
        return res.status(400).json({ message: err.message });
      next();
    });
  };
};

// Guard profile photo (images only, 5 MB)
const handleGuardPhotoUpload = makeMiddleware(
  makeStorage('guards'), ALLOWED_IMAGES, 5, 'photo'
);

// Guard document/certificate (images + PDF + DOCX, 10 MB)
const handleGuardDocUpload = makeMiddleware(
  makeStorage('guards/docs'), ALLOWED_DOCS, 10, 'attachment'
);

const deleteFile = (urlPath) => {
  if (!urlPath) return;
  try {
    const abs = path.join(process.cwd(), urlPath.replace(/^\//, ''));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch { /* silent */ }
};

module.exports = { handleGuardPhotoUpload, handleGuardDocUpload, deleteFile };
