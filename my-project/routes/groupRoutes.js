const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const { protect } = require('../middleware/auth');
const groupController = require('../controllers/groupController');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/prizes');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and MP4 are allowed.'));
    }
  },
});

// ✅ ADD THE MISSING ROUTES:

// Call number for bingo game (this is what your frontend is calling)
router.post('/:groupId/call-number', protect, groupController.callNumber);

// Set card limit
router.post('/:groupId/set-card-limit', protect, groupController.setCardLimit);

// Check card limit
router.post('/:groupId/check-card-limit', protect, groupController.checkCardLimit);

// Start game manually
router.post('/:groupId/start-game', protect, groupController.startGame);

// ✅ EXISTING ROUTES (keep these):

// Set prize
router.post(
  '/:groupId/set-prize',
  protect,
  upload.single('prizeFile'),
  groupController.setPrize
);

// Add card to group
router.post('/:groupId/add-card', protect, groupController.addCardsToGroup);

// Clear bingo cards
router.delete('/:groupId/clear-bingo-cards', protect, groupController.clearBingoCards);

// Get user cards
router.get('/:groupId/my-cards', protect, groupController.getUserCards);

// Get all groups
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('members', 'name')
      .populate('createdBy', 'name');
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// Create a new group
router.post('/', protect, async (req, res) => {
  try {
    const { name, price, currency, memberLimit, isPrivate } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const group = new Group({
      name,
      price: Number(price),
      currency: currency || 'USD',
      memberLimit: memberLimit || 0,
      isPrivate: isPrivate || false,
      members: [req.user._id],
      createdBy: {
        _id: req.user._id,
        name: req.user.name,
      },
    });

    const savedGroup = await group.save();
    res.status(201).json(savedGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: error.message });
  }
});

// Join a group
router.post('/:groupId/join', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    if (group.memberLimit > 0 && group.members.length >= group.memberLimit) {
      return res.status(400).json({ message: 'Group full' });
    }

    group.members.push(req.user._id);
    await group.save();

    res.json(group);
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Error joining group' });
  }
});

// Leave a group
router.post('/:groupId/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.members = group.members.filter(
      (memberId) => memberId.toString() !== req.user._id.toString()
    );

    await group.save();

    res.status(200).json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Error leaving group' });
  }
});
// Add these routes after your existing routes:

// Call number route
router.post('/:groupId/call-number', protect, async (req, res) => {
  try {
    console.log('🎯 CALL NUMBER ROUTE HIT');
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Generate random number
    const letters = ['B', 'I', 'N', 'G', 'O'];
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(Math.random() * 75) + 1;
    const calledNumber = `${letter}${number}`;

    // Update group
    if (!group.calledNumbers) group.calledNumbers = [];
    group.calledNumbers.push(calledNumber);
    await group.save();

    console.log('✅ Number called:', calledNumber);

    res.json({
      success: true,
      calledNumber: calledNumber,
      calledNumbers: group.calledNumbers,
      message: `Number ${calledNumber} called successfully`
    });

  } catch (error) {
    console.error('❌ Error calling number:', error);
    res.status(500).json({ message: 'Error calling number: ' + error.message });
  }
});

// Set card limit route
router.post('/:groupId/set-card-limit', protect, async (req, res) => {
  try {
    console.log('🎯 SET CARD LIMIT ROUTE HIT');
    const { groupId } = req.params;
    const { cardLimit } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.cardLimit = cardLimit;
    await group.save();

    res.json({
      success: true,
      updatedGroup: group,
      message: `Card limit set to ${cardLimit}`
    });

  } catch (error) {
    console.error('❌ Error setting card limit:', error);
    res.status(500).json({ message: 'Error setting card limit: ' + error.message });
  }
});

// ✅ REMOVE OR UPDATE DUPLICATE ROUTES:

// Remove this duplicate route (you already have one above):
// router.post('/:groupId/start-game', protect, groupController.startGame);

// Remove this old route (replace with the new callNumber):
// router.post('/:groupId/call-number', protect, groupController.callNextNumber);

// Restart game
router.post('/:groupId/restart-game', protect, groupController.restartGame);

module.exports = router;