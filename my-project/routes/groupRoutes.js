const express = require('express');
const router = express.Router();
const Group = require('../models/Group'); // Import the Group model
const auth = require('../middleware/auth');
const { protect } = require('../middleware/auth'); // Import the protect middleware
const groupController = require('../controllers/groupController'); // Ensure this is correctly imported
const multer = require('multer'); // Import Multer for file uploads
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/prizes'); // Ensure this matches the directory path
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

// Route to set the prize
router.post(
  '/:groupId/set-prize',
  protect,
  upload.single('prizeFile'), // Handle file uploads
  groupController.setPrize // Call the setPrize function
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

// Start game and save bingo cards
router.post('/:groupId/start-game', protect, groupController.startGame);

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

// Route to call the next Bingo number
router.post('/:groupId/call-number', protect, groupController.callNextNumber);

// Route to restart the game
router.post('/:groupId/restart-game', protect, groupController.restartGame);

module.exports = router; 