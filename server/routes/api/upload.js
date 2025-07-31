const express = require('express');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { authenticateJwtToken } = require('../../middlewares/auth');
const uploadController = require('../../controllers/uploadController');
require('dotenv').config();

const router = express.Router();

// Config Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'documentos',
        resource_type: 'auto',
    },
});

const upload = multer({ storage });


router.post('/', authenticateJwtToken, upload.single('file'), uploadController.saveImage);

module.exports = router;