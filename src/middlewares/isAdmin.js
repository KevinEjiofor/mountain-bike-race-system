const isAdmin = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. User not found in request.'
        });
    }

    if (!req.user.role) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token. Role not found.'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admins only.'
        });
    }

    next();
};

module.exports = isAdmin;