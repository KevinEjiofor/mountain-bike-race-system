const express = require('express');
const adminController = require('../admin/controllers/AdminAuthController');
const isAdmin = require('../middlewares/isAdmin');
const authMiddleware = require('../middlewares/authMiddleware');


const router = express.Router();

router.post('/login', adminController.login);
router.post('/create', adminController.createAdmin);
router.post('/forgot-password', adminController.forgotPassword);
router.post('/validate-reset-token', adminController.validateResetToken);
router.post('/reset-password', adminController.resetPassword);
router.put('/change-password', authMiddleware, adminController.changePassword);
router.post('/logout', adminController.logout);
router.get('/user-overviews', authMiddleware,isAdmin, adminController.getUserOverviews);


module.exports = router;
