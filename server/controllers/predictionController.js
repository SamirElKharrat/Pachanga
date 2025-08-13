const Prediction = require('../models/prediction');
const User = require('../models/user');
const { authenticateJwtToken } = require('../middlewares/auth');


// Get all predictions
exports.getAllPredictions = async (req, res) => {
    try {
        const predictions = await Prediction.findAll();
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all predictions of a league
exports.getPredictionsByLeague = async (req, res) => {
    const { league_id } = req.params;
    try {
        const predictions = await Prediction.findAll({
            where: { league_id: league_id },
        });

        const UserPromises = predictions.map(prediction =>
            User.findOne({
                where: { id: prediction.user_id }
            })
        )

        const users = await Promise.all(UserPromises)

        const response = predictions.map((prediction, index) => ({
            ...prediction.dataValues,
            User: users[index]
        }))

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get prediction by ID
exports.getPredictionById = async (req, res) => {
    try {
        const prediction = await Prediction.findByPk(req.params.id);
        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get all predictions of a match
exports.getPredictionsByMatch = async (req, res) => {
    const { match_id } = req.params;
    try {
        const predictions = await Prediction.findAll({
            where: { match_id: match_id },
        });

        const UserPromises = predictions.map(prediction =>
            User.findOne({
                where: { id: prediction.user_id }
            })
        )

        const users = await Promise.all(UserPromises)

        const response = predictions.map((prediction, index) => ({
            ...prediction.dataValues,
            User: users[index]
        }))

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Get predictions by user ID
exports.getPredictionsByUserId = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { email: req.user.email },
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const predictions = await Prediction.findAll({
            where: { user_id: user.id }
        });
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create prediction
exports.createPrediction = async (req, res) => {
    try {
        const prediction = await Prediction.create(req.body);
        res.status(201).json(prediction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update prediction
exports.updatePrediction = async (req, res) => {
    try {
        const prediction = await Prediction.findByPk(req.params.id);
        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        const updatedPrediction = await prediction.update(req.body);
        res.json(updatedPrediction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete prediction
exports.deletePrediction = async (req, res) => {
    try {
        const prediction = await Prediction.findByPk(req.params.id);
        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        await prediction.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


//Check if user has predicted all games of the week
exports.checkPredictions = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { email: req.user.email },
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const predictions = await Prediction.findAll({
            where: { user_id: user.id }
        });
        const matches = await Match.findAll({
            where: { league_id: req.params.league_id }
        });
        const response = predictions.map((prediction, index) => ({
            ...prediction.dataValues,
            Match: matches[index]
        }))
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
