const express = require('express');
const RaceController = require('../raceSystem/controllers/RaceController');
const { authenticate } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();
const raceController = new RaceController();


router.use(authenticate, isAdmin);


router.post('/', raceController.createRace);
router.get('/', raceController.getAllRaces);
router.get('/search', raceController.searchRaces);
router.get('/upcoming', raceController.getUpcomingRaces);
router.get('/status/:status', raceController.getRacesByStatus);
router.get('/:id', raceController.getRaceById);
router.put('/:id', raceController.updateRace);
router.delete('/:id', raceController.deleteRace);



router.patch('/:raceId/start', raceController.startRace);
router.patch('/:raceId/finish', raceController.finishRace);
router.patch('/:raceId/status', raceController.updateRaceStatus);
router.patch('/:raceId/weather', raceController.updateWeatherConditions);


router.post('/:raceId/participants', raceController.registerParticipant);
router.get('/:raceId/participants', raceController.getRaceParticipants);


router.patch('/:raceId/riders/:riderId/finish', raceController.finishRace);
router.get('/:raceId/live-standings', raceController.getLiveStandings);

router.get('/:raceId/results', raceController.getRaceResults);
router.get('/:raceId/stats', raceController.getRaceStats);
router.get('/:raceId/eligibility', raceController.checkRaceEligibility);


router.get('/:raceId/top3-fastest', raceController.getTop3FastestRiders);
router.get('/:raceId/did-not-finish', raceController.getRidersWhoDidNotFinish);
router.get('/:raceId/non-participants', raceController.getRidersNotInRace);
router.get('/:raceId/report', raceController.getRaceReport);

module.exports = router;
