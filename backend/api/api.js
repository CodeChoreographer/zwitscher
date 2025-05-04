const { UserController } = require('../controllers/userController');

function apiRoutes(app) {
    const userController = new UserController();

    app.post('/register', (req, res) => userController.register(req, res));
    app.post('/login', (req, res) => userController.login(req, res));
}

module.exports = apiRoutes;
