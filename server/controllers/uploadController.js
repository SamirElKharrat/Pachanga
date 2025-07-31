
const Document = require('../models/Document');
const User = require('../models/user');

// Función exportada
exports.saveImage = async (req, res) => {
    try {
        const { originalname, mimetype, size, path } = req.file;

        const document = await Document.create({
            name: originalname,
            url: path,
            mimetype,
            size,
        });

        console.log(document.url)
        res.json({
            url: path
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir archivo' });
    }
};
