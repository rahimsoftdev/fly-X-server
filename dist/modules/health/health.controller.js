const getHealth = (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running successfully",
    });
};
export default getHealth;
//# sourceMappingURL=health.controller.js.map