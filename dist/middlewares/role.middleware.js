export const requireRole = (...allowedRoles) => (_req, res, next) => {
    const user = res.locals.user;
    if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({
            success: false,
            message: "You do not have permission to access this resource",
        });
    }
    next();
};
//# sourceMappingURL=role.middleware.js.map