// Role-Based Access Control Middleware

// Check if user has required role(s)
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Role hierarchy - higher roles have access to lower role features
const roleHierarchy = {
    admin: ['admin', 'operations', 'sales_agent'],
    operations: ['operations', 'sales_agent'],
    sales_agent: ['sales_agent']
};

// Check if user has access based on hierarchy
const requireMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const userRoles = roleHierarchy[req.user.role] || [];

        if (!userRoles.includes(minRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Check if user is admin
const isAdmin = requireRole('admin');

// Check if user is operations or admin
const isOperationsOrAdmin = requireRole('operations', 'admin');

// Check if user is sales agent only (for driver registration)
const isSalesAgent = requireRole('sales_agent');

module.exports = {
    requireRole,
    requireMinRole,
    isAdmin,
    isOperationsOrAdmin,
    isSalesAgent
};
