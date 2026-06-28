const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 120000, // 120s — tolerate slow upload connections (default is 60s)
});

const isConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Upload a buffer straight to Cloudinary via the streaming API.
// NOTE: we deliberately do NOT use multer-storage-cloudinary — its 4.x release is
// built for multer 1.x and hangs with multer 2.x (the file stream never flushes,
// so the request stalls until Cloudinary's timeout). Buffering in memory + upload_stream
// is reliable with multer 2.x.
const streamUpload = (buffer, folder, resourceType) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `cavero/${folder}`,
        resource_type: resourceType,
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

const collectFiles = (req) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) files.push(...req.files);
    else Object.values(req.files).forEach((arr) => files.push(...arr));
  }
  return files;
};

/**
 * Build an uploader whose .single/.array/.fields middleware buffers files in memory
 * and then pushes each one to Cloudinary, exposing the result the same way
 * multer-storage-cloudinary did:
 *   req.file(s)[*].path     = the https Cloudinary URL
 *   req.file(s)[*].filename = the Cloudinary public_id
 *
 * @param {string} folder  Cloudinary sub-folder, e.g. 'products' → cavero/products
 * @param {object} opts    { resourceType: 'image'|'video'|'auto' }
 */
function makeUpload(folder, { resourceType = 'image' } = {}) {
  const m = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB (covers reel videos)
  });

  const finalize = async (req) => {
    const files = collectFiles(req);
    for (const f of files) {
      if (!f || !f.buffer) continue;
      const result = await streamUpload(f.buffer, folder, resourceType);
      f.path = result.secure_url;
      f.filename = result.public_id;
      delete f.buffer; // free memory once uploaded
    }
  };

  const wrap = (mw) => (req, res, next) => {
    mw(req, res, (err) => {
      if (err) return next(err);
      finalize(req)
        .then(() => next())
        .catch((e) =>
          res.status(500).json({ success: false, message: 'Image upload failed', error: e.message })
        );
    });
  };

  return {
    single: (name) => wrap(m.single(name)),
    array: (name, maxCount) => wrap(m.array(name, maxCount)),
    fields: (fields) => wrap(m.fields(fields)),
    none: () => m.none(),
  };
}

module.exports = { cloudinary, makeUpload, isConfigured };
