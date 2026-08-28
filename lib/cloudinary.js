const cloudinaryPkg = require('cloudinary');
const cloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

const cloudinary = cloudinaryPkg.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const IMAGE_TYPES = /^image\/(jpeg|png|webp|gif|svg\+xml)$/;
const VIDEO_TYPE = 'video/mp4';

// Builds a ready-to-use multer instance that streams uploads straight to
// Cloudinary under lightduststudio/<folder>. `allowVideo` also accepts MP4.
function makeUpload(folder, { allowVideo = false, maxSizeMB = 25 } = {}) {
  const storage = cloudinaryStorage({
    cloudinary: cloudinaryPkg,
    params: (req, file, cb) => {
      const isVideo = file.mimetype === VIDEO_TYPE;
      cb(undefined, {
        folder: `lightduststudio/${folder}`,
        resource_type: isVideo ? 'video' : 'image'
      });
    }
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ok = IMAGE_TYPES.test(file.mimetype) || (allowVideo && file.mimetype === VIDEO_TYPE);
      cb(ok ? null : new Error(allowVideo
        ? '請上傳 JPG/PNG/WEBP/GIF 圖片或 MP4 影片'
        : '請上傳 JPG/PNG/WEBP/GIF 圖片'), ok);
    }
  });
}

// Cloudinary's SDK still expects Node-style callbacks in some contexts, but
// the modern uploader API returns promises — used for best-effort cleanup.
async function destroyAsset(publicId, resourceType) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'image' });
  } catch (err) {
    console.warn('[cloudinary] failed to delete asset:', publicId, err.message);
  }
}

// Cloudinary URLs self-describe their resource type and public_id
// (.../image/upload/v123/folder/name.jpg or .../video/upload/...), so a
// stored secure_url alone is enough to delete the asset later.
async function destroyByUrl(url) {
  if (!url || !url.includes('res.cloudinary.com')) return;
  const match = url.match(/\/(image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  if (!match) return;
  await destroyAsset(match[2], match[1]);
}

module.exports = { cloudinary, makeUpload, destroyAsset, destroyByUrl };
