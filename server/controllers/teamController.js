const Team = require('../models/team');
const { authenticateJwtToken } = require('../middlewares/auth');

// Get all teams
exports.getAllTeams = async (req, res) => {
    try {
        const teams = await Team.findAll();
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get team by ID
exports.getTeamById = async (req, res) => {
    try {
        const team = await Team.findByPk(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.json(team);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create team
exports.createTeam = async (req, res) => {
    try {
        const team = await Team.create(req.body);
        res.status(201).json(team);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update team
exports.updateTeam = async (req, res) => {
    try {
        const team = await Team.findByPk(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        const updatedTeam = await team.update(req.body);
        res.json(updatedTeam);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete team
exports.deleteTeam = async (req, res) => {
    try {
        const team = await Team.findByPk(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        await team.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};