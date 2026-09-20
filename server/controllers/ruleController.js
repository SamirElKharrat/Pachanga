const Rule = require('../models/rule');
const League = require('../models/league');

/**
 * Get rules filtered by league_id or year (Pachanga general)
 */
exports.getRules = async (req, res) => {
    try {
        const { league_id, year } = req.query;
        const whereClause = {};

        if (league_id !== undefined) {
            if (league_id === 'null' || league_id === 'pachanga' || league_id === '') {
                whereClause.league_id = null;
            } else {
                whereClause.league_id = parseInt(league_id, 10);
            }
        } else {
            // Default to Pachanga rules (league_id is null)
            whereClause.league_id = null;
        }

        if (year) {
            whereClause.year = parseInt(year, 10);
        }

        const rules = await Rule.findAll({
            where: whereClause,
            include: [{
                model: League,
                as: 'League',
                attributes: ['id', 'name', 'logo_url']
            }],
            order: [['order_num', 'ASC'], ['id', 'ASC']]
        });

        res.json({
            year: year ? parseInt(year, 10) : undefined,
            league_id: whereClause.league_id,
            rules
        });
    } catch (error) {
        console.error("Error in getRules:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get a single rule by ID
 */
exports.getRuleById = async (req, res) => {
    try {
        const { id } = req.params;
        const rule = await Rule.findByPk(id, {
            include: [{
                model: League,
                as: 'League',
                attributes: ['id', 'name', 'logo_url']
            }]
        });

        if (!rule) {
            return res.status(404).json({ error: 'Normativa no encontrada' });
        }

        res.json(rule);
    } catch (error) {
        console.error("Error in getRuleById:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create a new rule entry (Admin only)
 */
exports.createRule = async (req, res) => {
    try {
        const { league_id, year, title, content, category, order_num } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'El contenido de la normativa es obligatorio' });
        }

        const parsedLeagueId = league_id && league_id !== 'null' ? parseInt(league_id, 10) : null;
        const parsedYear = year ? parseInt(year, 10) : new Date().getFullYear();

        const rule = await Rule.create({
            league_id: parsedLeagueId,
            year: parsedYear,
            title: title ? title.trim() : null,
            content: content.trim(),
            category: category ? category.trim() : 'general',
            order_num: order_num !== undefined ? parseInt(order_num, 10) : 0
        });

        res.status(201).json(rule);
    } catch (error) {
        console.error("Error in createRule:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update an existing rule entry (Admin only)
 */
exports.updateRule = async (req, res) => {
    try {
        const { id } = req.params;
        const { league_id, year, title, content, category, order_num } = req.body;

        const rule = await Rule.findByPk(id);
        if (!rule) {
            return res.status(404).json({ error: 'Normativa no encontrada' });
        }

        if (content !== undefined) {
            if (!content || !content.trim()) {
                return res.status(400).json({ error: 'El contenido no puede estar vacío' });
            }
            rule.content = content.trim();
        }

        if (title !== undefined) rule.title = title ? title.trim() : null;
        if (category !== undefined) rule.category = category ? category.trim() : 'general';
        if (order_num !== undefined) rule.order_num = parseInt(order_num, 10);
        if (year !== undefined) rule.year = parseInt(year, 10);
        if (league_id !== undefined) {
            rule.league_id = league_id && league_id !== 'null' ? parseInt(league_id, 10) : null;
        }

        await rule.save();
        res.json(rule);
    } catch (error) {
        console.error("Error in updateRule:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete a rule entry (Admin only)
 */
exports.deleteRule = async (req, res) => {
    try {
        const { id } = req.params;
        const rule = await Rule.findByPk(id);
        if (!rule) {
            return res.status(404).json({ error: 'Normativa no encontrada' });
        }

        await rule.destroy();
        res.json({ message: 'Normativa eliminada correctamente' });
    } catch (error) {
        console.error("Error in deleteRule:", error);
        res.status(500).json({ error: error.message });
    }
};
