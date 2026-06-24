const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

//Check if the user is authenticated
const authenticateJwtToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = req.cookies.token || (authHeader && authHeader.split(' ')[1]); //Get the token from cookie or header
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }


    //Verify the token
    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        req.user = user; //Add user to the request
        next();
    });
};

module.exports = { authenticateJwtToken };