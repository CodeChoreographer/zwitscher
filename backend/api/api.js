const { UserController } = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    registerSchema,
    loginSchema,
    updateUsernameSchema,
    changePasswordSchema
} = require('../middleware/validationSchemas');

function apiRoutes(app) {
    const userController = new UserController();

    app.post('/register', validate(registerSchema), (req, res) =>
        userController.register(req, res)
    );

    app.post('/login', validate(loginSchema), (req, res) =>
        userController.login(req, res)
    );

    app.get('/api/users/profile', authenticateToken, (req, res) =>
        userController.getProfile(req, res)
    );

    app.put('/api/users/update-username', authenticateToken, validate(updateUsernameSchema), (req, res) =>
        userController.updateUsername(req, res)
    );

    app.put('/api/users/change-password', authenticateToken, validate(changePasswordSchema), (req, res) =>
        userController.changePassword(req, res)
    );
}

module.exports = apiRoutes;
