const Changelog = require('../models/changelog');

/**
 * Las novedades de la web.
 *
 * CRUD normal y corriente. La única regla que merece nombre está en el orden: lo más
 * reciente primero, y dentro de una versión el orden en que se escribió.
 */

// Todas, ordenadas para pintarlas directamente.
exports.getAllChangelog = async (req, res) => {
    try {
        const entries = await Changelog.findAll({
            // Por fecha y no por `version`: '1.10' va detrás de '1.9' para una
            // persona y delante para un ordenador.
            order: [['release_date', 'DESC'], ['id', 'ASC']]
        });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getChangelogById = async (req, res) => {
    try {
        const entry = await Changelog.findByPk(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Changelog entry not found' });
        }
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createChangelog = async (req, res) => {
    try {
        const entry = await Changelog.create(req.body);
        res.status(201).json(entry);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateChangelog = async (req, res) => {
    try {
        const entry = await Changelog.findByPk(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Changelog entry not found' });
        }
        const updated = await entry.update(req.body);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteChangelog = async (req, res) => {
    try {
        const entry = await Changelog.findByPk(req.params.id);
        if (!entry) {
            return res.status(404).json({ error: 'Changelog entry not found' });
        }
        await entry.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
