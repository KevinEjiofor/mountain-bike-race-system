
const express = require('express');
const RiderController = require('../rider/controllers/RiderController');
const { authenticate } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();
const riderController = new RiderController();

router.use(authenticate, isAdmin);

router.post('/', riderController.createRider);
router.get('/', riderController.getAllRiders);
router.get('/search', riderController.searchRiders);
router.get('/:id', riderController.getRiderById);
router.put('/:id', riderController.updateRider);
router.delete('/:id', riderController.deleteRider);


module.exports = router;