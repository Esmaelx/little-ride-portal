const AuditLog = require('../models/AuditLog');

// Middleware to create audit log entries
const createAuditLog = (action, entityType) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        res.json = async function (data) {
            // Only log if response was successful
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                try {
                    const logData = {
                        action,
                        entityType,
                        entityId: data?.data?._id || req.params.id,
                        description: getDescription(action, entityType, data),
                        performedBy: req.user._id,
                        performedByName: req.user.name,
                        performedByRole: req.user.role,
                        previousValues: req.previousValues,
                        newValues: req.body,
                        ipAddress: req.ip || req.connection?.remoteAddress,
                        userAgent: req.headers['user-agent']
                    };

                    // Don't await - fire and forget for performance
                    AuditLog.log(logData).catch(err => {
                        console.error('Error creating audit log:', err);
                    });
                } catch (error) {
                    console.error('Audit log error:', error);
                }
            }

            return originalJson(data);
        };

        next();
    };
};

// Generate human-readable descriptions
function getDescription(action, entityType, data) {
    const entityName = data?.data?.name ||
        data?.data?.personalInfo?.firstName ||
        data?.data?.email ||
        'item';

    const descriptions = {
        create: `Created new ${entityType}: ${entityName}`,
        update: `Updated ${entityType}: ${entityName}`,
        delete: `Deleted ${entityType}: ${entityName}`,
        approve: `Approved ${entityType}: ${entityName}`,
        reject: `Rejected ${entityType}: ${entityName}`,
        login: `User logged in`,
        logout: `User logged out`,
        status_change: `Changed status of ${entityType}: ${entityName}`
    };

    return descriptions[action] || `${action} on ${entityType}`;
}

module.exports = { createAuditLog };
