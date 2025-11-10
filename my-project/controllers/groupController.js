const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const { bingoCardSchema } = require('../models/Group');

// Fetch all groups
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('members', 'name email')
      .select('-__v');

    const formattedGroups = groups.map(group => ({
      id: group._id,
      name: group.name,
      createdBy: group.createdBy,
      currentMembers: group.members.length,
      maxMembers: group.maxMembers,
      price: group.price,
      currency: group.currency,
      isMember: group.members.some(member =>
        member._id.toString() === req.userData.userId
      )
    }));

    res.status(200).json(formattedGroups);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching groups',
      error: error.message
    });
  }
};

// Fetch a group by ID
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email')
      .select('-__v');

    if (!group) {
      return res.status(404).json({
        message: 'Group not found'
      });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching group',
      error: error.message
    });
  }
};

// Join a group
exports.joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        message: 'Group not found'
      });
    }

    // Check if user is already a member
    if (group.members.includes(req.userData.userId)) {
      return res.status(400).json({
        message: 'You are already a member of this group'
      });
    }

    // Check if group is full
    if (group.maxMembers !== "unlimited" &&
        group.members.length >= group.maxMembers) {
      return res.status(400).json({
        message: 'Group is full'
      });
    }

    // Add user to group
    group.members.push(req.userData.userId);
    await group.save();

    // Add group to user's groups
    await User.findByIdAndUpdate(
      req.userData.userId,
      { $push: { groups: group._id } }
    );

    res.status(200).json({
      message: 'Successfully joined group',
      group
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error joining group',
      error: error.message
    });
  }
};

// Fetch groups the user belongs to
exports.getMyGroups = async (req, res) => {
  try {
    const user = await User.findById(req.userData.userId)
      .populate({
        path: 'groups',
        populate: {
          path: 'members',
          select: 'name email'
        }
      });

    const myGroups = user.groups.map(group => ({
      id: group._id,
      name: group.name,
      createdBy: group.createdBy,
      currentMembers: group.members.length,
      maxMembers: group.maxMembers,
      price: group.price,
      currency: group.currency,
      isOwner: group.owner.toString() === req.userData.userId
    }));

    res.status(200).json(myGroups);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching your groups',
      error: error.message
    });
  }
};

// Delete a group
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        message: 'Group not found'
      });
    }

    // Check if user is the group owner
    if (group.owner.toString() !== req.userData.userId) {
      return res.status(403).json({
        message: 'Only the group owner can delete the group'
      });
    }

    // Remove group from all members' groups array
    await User.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );

    // Delete the group
    await group.delete();

    res.status(200).json({
      message: 'Group deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting group',
      error: error.message
    });
  }
};

// Start a game
exports.startGame = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { bingoCards } = req.body;

    if (!bingoCards || !Array.isArray(bingoCards)) {
      return res.status(400).json({ message: 'Invalid bingo cards data' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Validate and save bingo cards
    const bingoCardsToSave = bingoCards.map(function(cardData) {
      return Object.assign({
        groupName: group.name,
        userId: req.user._id,
        userName: req.user.name,
        userEmail: req.user.email
      }, cardData);
    });

    group.bingoCards = group.bingoCards.concat(bingoCardsToSave);
    await group.save();

    res.status(200).json({ message: 'Game started successfully', bingoCards: group.bingoCards });
  } catch (error) {
    console.error('Error in startGame:', error);
    res.status(500).json({ message: 'Failed to start game' });
  }
};

// Call the next number
exports.callNextNumber = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const calledNumbers = group.calledNumbers || [];
    const allPossibleNumbers = 75;

    if (calledNumbers.length >= allPossibleNumbers) {
      return res.status(200).json({ message: 'All numbers have been called. Game over!' });
    }

    const newNumber = generateRandomNumber(calledNumbers);
    group.calledNumbers.push(newNumber);
    await group.save();

    res.status(200).json({ message: 'Number called successfully', calledNumber: newNumber });
  } catch (error) {
    console.error('Error in callNextNumber:', error);
    res.status(500).json({ message: 'Failed to call next number' });
  }
};

// Helper function to generate a random number
const generateRandomNumber = (calledNumbers) => {
  const letters = ['B', 'I', 'N', 'G', 'O'];
  let newNumber = null;

  while (!newNumber) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const range = getRangeForLetter(letter);
    const number = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    const potentialNumber = `${letter}${number}`;

    if (!calledNumbers.includes(potentialNumber)) {
      newNumber = potentialNumber;
    }
  }

  return newNumber;
};

// Helper function to get range for a letter
const getRangeForLetter = (letter) => {
  switch (letter) {
    case 'B': return { min: 1, max: 75 };
    case 'I': return { min: 1, max: 75 };
    case 'N': return { min: 1, max: 75 };
    case 'G': return { min: 1, max: 75 };
    case 'O': return { min: 1, max: 75 };
    default: throw new Error('Invalid letter');
  }
};

// Add cards to a group
exports.addCardsToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { cards } = req.body;

  try {
    // Validate the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Validate the user
    const userId = req.user._id;
    const userName = req.user.name;
    const userEmail = req.user.email;

    console.log('Incoming cards:', cards);

    if (!group.members.some((member) => member.toString() === userId.toString())) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Validate the cards field
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ message: 'Invalid cards data. Cards must be a non-empty array.' });
    }

    // Transform and validate the bingo cards
    const bingoCardsWithUserDetails = cards.map((card, index) => {
      if (!card.numbers) {
        throw new Error(`Card at index ${index} must include a valid "numbers" field.`);
      }

      let transformedNumbers;

      // Check if the numbers field is already in the expected object format
      if (
        typeof card.numbers === 'object' &&
        ['B', 'I', 'N', 'G', 'O'].every((key) => Array.isArray(card.numbers[key]))
      ) {
        transformedNumbers = card.numbers; // Use the existing structure
      } else if (Array.isArray(card.numbers)) {
        // Transform the numbers array into the expected object format
        transformedNumbers = {};
        card.numbers.forEach((row, rowIndex) => {
          const [letter, ...numbers] = row;
          if (!['B', 'I', 'N', 'G', 'O'].includes(letter)) {
            throw new Error(`Invalid letter "${letter}" in the "numbers" field at row ${rowIndex}.`);
          }
          transformedNumbers[letter] = numbers;
        });
      } else {
        throw new Error(`Invalid "numbers" field format at card index ${index}.`);
      }

      // Validate that the transformed numbers object contains the required keys
      const keys = ['B', 'I', 'N', 'G', 'O'];
      for (const key of keys) {
        if (!Array.isArray(transformedNumbers[key]) || transformedNumbers[key].length === 0) {
          throw new Error(`The "${key}" key in the "numbers" field must contain a non-empty array.`);
        }
      }

      return {
        ...card,
        numbers: transformedNumbers, // Use the transformed or existing numbers
        groupName: group.name,
        userId,
        userName,
        userEmail,
      };
    });

    console.log('Validated and transformed bingo cards:', bingoCardsWithUserDetails);

    // Add the cards to the group's bingoCards array
    group.bingoCards = group.bingoCards.concat(bingoCardsWithUserDetails);

    console.log('Group bingoCards before save:', group.bingoCards);

    // Save the updated group
    await group.save();

    console.log('Group bingoCards after save:', group.bingoCards);

    res.status(200).json({ success: true, message: 'Bingo cards added successfully', group });
  } catch (error) {
    console.error('Error adding bingo cards to group:', error);

    // Handle validation errors
    if (error.message.includes('numbers')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

// Clear user's bingo cards
exports.clearBingoCards = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.bingoCards = group.bingoCards.filter(card => card.userId.toString() !== req.user._id.toString());
    await group.save();

    res.status(200).json({ message: 'Bingo cards cleared successfully' });
  } catch (error) {
    console.error('Error clearing bingo cards:', error);
    res.status(500).json({ message: 'Failed to clear bingo cards' });
  }
};


// Get user's bingo cards
exports.getUserCards = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // No spread operator here, so no change needed
    const userCards = group.bingoCards.filter(function(card) {
      return card.userId.toString() === req.user._id.toString();
    });
    res.status(200).json({ cards: userCards });
  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({ message: 'Failed to fetch user cards' });
  }
};

// Set prize for a group
exports.setPrize = async (req, res) => {
  const { groupId } = req.params;
  const prizeFile = req.file;

  if (!prizeFile) {
    return res.status(400).json({ message: 'No prize file uploaded' });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Determine prize type based on mimetype
    let prizeType = null;
    if (prizeFile.mimetype.startsWith('image/')) {
      prizeType = 'photo';
    } else if (prizeFile.mimetype.startsWith('video/')) {
      prizeType = 'video';
    } else {
      prizeType = 'money'; // fallback or handle differently if needed
    }

    // Save prize file info to group (assuming group has a prize field)
    group.prize = {
      type: prizeType,
      filename: prizeFile.filename,
      path: prizeFile.path,
      mimetype: prizeFile.mimetype,
      size: prizeFile.size,
      originalname: prizeFile.originalname,
      uploadDate: new Date()
    };

    await group.save();

    res.status(200).json({ message: 'Prize set successfully', prize: group.prize });
  } catch (error) {
    console.error('Error setting prize:', error);
    res.status(500).json({ message: 'Failed to set prize' });
  }
};

// Restart the game
exports.restartGame = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Reset game state fields
    group.calledNumbers = [];
    group.bingoCards = [];
    // Add any other fields to reset as needed

    await group.save();

    res.status(200).json({ message: 'Game restarted successfully' });
  } catch (error) {
    console.error('Error restarting game:', error);
    res.status(500).json({ message: 'Failed to restart game' });
  }
};
// Call number for bingo game
exports.callNumber = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.gameStarted) {
      return res.status(400).json({ message: 'The game has not started yet' });
    }

    if (!group.bingoCards || group.bingoCards.length === 0) {
      return res.status(400).json({ message: 'No cards stored for this group' });
    }

    // Extract all letter-number combinations from the stored bingo cards
    const allCombinations = group.bingoCards.flatMap((card) =>
      Object.entries(card.numbers).flatMap(([letter, numbers]) =>
        numbers.map((num) => `${letter}${num}`)
      )
    );

    // Filter out already called combinations
    const remainingCombinations = allCombinations.filter(
      (combination) => !group.calledNumbers.includes(combination)
    );

    if (remainingCombinations.length === 0) {
      return res.json({
        success: true,
        message: 'All numbers have been called',
        calledNumbers: group.calledNumbers,
      });
    }

    // Call a random combination
    const randomIndex = Math.floor(Math.random() * remainingCombinations.length);
    const calledNumber = remainingCombinations[randomIndex];

    // Update the group with the called combination
    group.calledNumbers.push(calledNumber);
    await group.save();

    console.log('🎲 Number called:', calledNumber);
    console.log('📊 Total called numbers:', group.calledNumbers.length);

    // Check for a winner
    const winner = group.bingoCards.find((card) =>
      Object.entries(card.numbers).every(([letter, numbers]) =>
        numbers.every((num) => group.calledNumbers.includes(`${letter}${num}`))
      )
    );

    if (winner) {
      console.log('🎉 Winner found:', winner.userName);
      return res.json({
        success: true,
        calledNumber: calledNumber,
        calledNumbers: group.calledNumbers,
        winner: {
          _id: winner._id,
          name: winner.userName,
          email: winner.userEmail
        },
      });
    }

    res.json({ 
      success: true, 
      calledNumber: calledNumber, 
      calledNumbers: group.calledNumbers 
    });
  } catch (error) {
    console.error('Error calling number:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
// Set card limit
exports.setCardLimit = async (req, res) => {
  const { groupId } = req.params;
  const { cardLimit } = req.body;

  if (!cardLimit || cardLimit <= 0) {
    return res.status(400).json({ message: 'Invalid card limit' });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.cardLimit = cardLimit;
    await group.save();

    // Check if the card limit is reached with bingo cards
    const currentCardCount = group.bingoCards ? group.bingoCards.length : 0;
    
    console.log(`Card limit check: ${currentCardCount}/${cardLimit} cards`);
    
    if (currentCardCount >= cardLimit && !group.gameStarted) {
      group.gameStarted = true;
      await group.save();
      console.log(`🎮 Game started for group ${groupId} - Card limit reached: ${currentCardCount}/${cardLimit}`);
      
      return res.json({ 
        success: true, 
        updatedGroup: group,
        gameStarted: true,
        message: `Game started! Card limit reached (${currentCardCount}/${cardLimit})`
      });
    }

    res.json({ 
      success: true, 
      updatedGroup: group,
      gameStarted: false,
      message: `Card limit set to ${cardLimit}. Current cards: ${currentCardCount}/${cardLimit}`
    });
  } catch (error) {
    console.error('Error setting card limit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check card limit
exports.checkCardLimit = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // If game is already started, no need to check
    if (group.gameStarted) {
      return res.json({ 
        gameStarted: true, 
        message: 'Game already started' 
      });
    }

    // Check if card limit is set and reached
    if (group.cardLimit && group.cardLimit > 0) {
      const currentCardCount = group.bingoCards ? group.bingoCards.length : 0;
      
      console.log(`Card limit check: ${currentCardCount}/${group.cardLimit}`);
      
      if (currentCardCount >= group.cardLimit) {
        group.gameStarted = true;
        await group.save();
        
        console.log(`🎮 Game auto-started for group ${groupId} - Cards: ${currentCardCount}/${group.cardLimit}`);
        
        return res.json({ 
          gameStarted: true,
          bingoCards: group.bingoCards,
          message: `Game started! Card limit reached (${currentCardCount}/${group.cardLimit})`
        });
      }
      
      return res.json({ 
        gameStarted: false,
        currentCards: currentCardCount,
        cardLimit: group.cardLimit,
        message: `Not yet reached: ${currentCardCount}/${group.cardLimit}`
      });
    }

    res.json({ 
      gameStarted: false,
      message: 'No card limit set'
    });
  } catch (error) {
    console.error('Error checking card limit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Start game manually
exports.startGame = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.gameStarted) {
      return res.status(400).json({ message: 'Game already started' });
    }

    group.gameStarted = true;
    await group.save();

    res.json({ 
      success: true, 
      message: 'Game started successfully',
      updatedGroup: group 
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};