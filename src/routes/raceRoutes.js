const express = require('express');
const RaceController = require('../raceSystem/controllers/RaceController');

const router = express.Router();
const raceController = new RaceController();


router.post('/', raceController.createRace);
router.get('/', raceController.getAllRaces);
router.get('/search', raceController.searchRaces);
router.get('/upcoming', raceController.getUpcomingRaces);
router.get('/status/:status', raceController.getRacesByStatus);


router.get('/:raceId', raceController.getRaceById);
router.put('/:raceId', raceController.updateRace);
router.delete('/:raceId', raceController.deleteRace);


router.patch('/:raceId/start', raceController.startRace);
router.patch('/:raceId/finish', raceController.finishRace);

router.get('/:raceId/participants', raceController.getRaceParticipants);
router.get('/:raceId/results', raceController.getRaceResults);
router.get('/:raceId/stats', raceController.getRaceStats);
router.get('/:raceId/eligibility', raceController.checkRaceEligibility);

router.get('/:raceId/top3-fastest', raceController.getTop3FastestRiders);
router.get('/:raceId/did-not-finish', raceController.getRidersWhoDidNotFinish);
router.get('/:raceId/non-participants', raceController.getRidersNotInRace);
router.get('/:raceId/report', raceController.getRaceReport);


router.put('/:raceId/weather', raceController.updateWeatherConditions);


module.exports = router;