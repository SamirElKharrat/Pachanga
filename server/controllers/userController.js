const User = require('../models/user')
const Role = require('../models/role')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }, // No mostrar contraseña
      include: [{
        model: Role,
        attributes: ['name']
      }]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user by id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        attributes: ['name']
      }]
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Get User by Token
exports.getUserByToken = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { email: req.user.email },
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Create user and add a role to that user
exports.createUser = async (req, res) => {
  const { username, email, password, logo_url } = req.body;

  try {
    const hashedPass = await bcrypt.hash(password, 10);

    const user = await User.create({ username, email, password: hashedPass, logo_url });
    const roleId = req.body.role ? req.body.role : 2;
    const role = await Role.findByPk(roleId);
    await user.addRole(role);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//Login an user
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({
      where: { username: username }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    //Compare the passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    //Generate a token with 24h life time
    const token = jwt.sign({ email: user.email, role: user.role }, process.env.SECRET_KEY, { expiresIn: '24h' });
    console.log("Usuario Logeado", token)
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Change Password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    const hashedPass = await bcrypt.hash(newPassword, 10);
    const updatedUser = await user.update({ password: hashedPass });
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update user
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const updatedUser = await user.update(req.body);
    // No enviar la contraseña en la respuesta
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await user.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//Protected route
exports.protectedRoute = async (req, res) => {
  res.json({ message: "This is a protected route" });
}

//Admin route
exports.adminRoute = async (req, res) => {
  try {
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

    // Check if user has admin role
    console.log(user)
    const hasAdminRole = user.Roles.some(role => role.name === 'admin');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'You do not have the necessary permissions to access this route' });
    }
    res.json({ message: "This is an admin route" });
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ error: error.message });
  }
}


