const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const Admin = require('../admin/data/models/adminModel');


const authMiddleware = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded || !decoded.id || !decoded.role) {
            return res.status(401).json({ message: 'Invalid token structure' });
        }

        req.user = decoded;

        if (decoded.role === 'admin') {
            const admin = await Admin.findById(decoded.id);
            if (!admin) {
                return res.status(401).json({ message: 'Admin not found or unauthorized' });
            }
            req.admin = admin;
        } else if (decoded.role === 'user') {
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'User not found or unauthorized' });
            }
            req.userDetails = user;
        } else {
            return res.status(403).json({ message: 'Invalid role' });
        }

        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = authMiddleware;
module.exports.authenticate = authMiddleware;
module.exports.authorize = authorize;

