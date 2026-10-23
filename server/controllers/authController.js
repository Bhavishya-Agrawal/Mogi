const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });

const signToken = (user) => jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

// Same rules the register form shows: 8+ characters, at least one letter and one number
const passwordProblem = (password) => {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password needs at least one letter and one number';
  return null;
};

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim() || !email.trim()) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ error: problem });

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    // Same message for "no such user" and "wrong password" so emails can't be probed
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.status(200).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

// Settings page: change name and/or password. Email is locked.
async function updateMe(req, res, next) {
  try {
    const { name, currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
      user.name = name.trim().slice(0, 60);
    }

    if (newPassword) {
      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      const problem = passwordProblem(newPassword);
      if (problem) return res.status(400).json({ error: problem });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getMe, updateMe };
