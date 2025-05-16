const { z } = require('zod');

const registerSchema = z.object({
    username: z.string().min(3, 'Benutzername zu kurz').max(32, 'Benutzername zu lang'),
    password: z.string()
        .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
        .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten')
        .regex(/[\W_]/, 'Passwort muss mindestens ein Sonderzeichen enthalten'),
});

const loginSchema = z.object({
    username: z.string().min(1, 'Benutzername erforderlich'),
    password: z.string().min(1, 'Passwort erforderlich'),
});

const updateUsernameSchema = z.object({
    newUsername: z.string().min(3, 'Benutzername zu kurz').max(32, 'Benutzername zu lang'),
});

const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Altes Passwort erforderlich'),
    newPassword: z.string()
        .min(8, 'Neues Passwort muss mindestens 8 Zeichen lang sein')
        .regex(/[0-9]/, 'Neues Passwort muss mindestens eine Zahl enthalten')
        .regex(/[\W_]/, 'Neues Passwort muss mindestens ein Sonderzeichen enthalten'),
});

module.exports = {
    registerSchema,
    loginSchema,
    updateUsernameSchema,
    changePasswordSchema
};
