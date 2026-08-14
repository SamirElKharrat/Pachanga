const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Role = require('../models/role');
require('dotenv').config();

// Check if the user is authenticated
const authenticateJwtToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = req.cookies.token || (authHeader && authHeader.split(' ')[1]);
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify the token
    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    });
};

// Check if the user is an admin
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const user = await User.findOne({
            where: { email: req.user.email },
            include: [{
                model: Role,
                through: 'UserRoles'
            }]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hasAdminRole = user.Roles && user.Roles.some(role => role.name === 'admin');
        if (!hasAdminRole) {
            return res.status(403).json({ error: 'You do not have the necessary permissions to access this resource' });
        }

        req.fullUser = user;
        next();
    } catch (error) {
        console.error('Error in requireAdmin middleware:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { authenticateJwtToken, requireAdmin };