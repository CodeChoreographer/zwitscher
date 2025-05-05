const { UserController } = require('../controllers/userController');
const authenticateToken = require("../middleware/auth");

function apiRoutes(app) {
    const userController = new UserController();

    app.post('/register', (req, res) => userController.register(req, res));
    app.post('/login', (req, res) => userController.login(req, res));
    app.get('/api/users/profile', authenticateToken, (req, res) => userController.getProfile(req, res));
    app.put('/api/users/update-username', authenticateToken, (req, res) => userController.updateUsername(req, res));
    app.put('/api/users/change-password', authenticateToken, (req, res) => userController.changePassword(req, res));

}

module.exports = apiRoutes;
