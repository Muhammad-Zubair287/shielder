import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../errors/api.error';
import { ensureProductImageDir } from '../services/product-image.service';

// Ensure upload directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folder = uploadDir;
    if (file.fieldname === 'image') {
      folder = path.join(uploadDir, 'categories');
    } else if (file.fieldname === 'profileImage') {
      folder = path.join(uploadDir, 'profile');
    } else if (file.fieldname === 'productImage') {
      folder = ensureProductImageDir();
    } else if (file.fieldname === 'appImage') {
      folder = path.join(uploadDir, 'applications');
    }
    
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    if (file.fieldname === 'productImage') {
      const productId = typeof req.params?.id === 'string' && req.params.id ? req.params.id : 'product';
      cb(null, `${productId}-${uniqueSuffix}${path.extname(file.originalname)}`);
      return;
    }

    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/jfif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file type. Only JPEG, PNG and WEBP are allowed.', 400), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
