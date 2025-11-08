const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const User = require("./models/User");
const Group = require("./models/Group");
const fs = require("fs");
const path = require("path");
const os = require("os");
require("dotenv").config();

const app = express();
const PORT = 5000;

const SECRET_KEY = process.env.SECRET_KEY || "your_default_secret_key";

// ✅ NUCLEAR CORS FIX - Replace entire CORS section
app.use(cors({
  origin: "*", // Allow ALL origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle ALL preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.status(204).send();
});

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  next();
});

// Debug middleware
app.use((req, res, next) => {
  console.log('=== REQUEST DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Origin:', req.headers.origin);
  console.log('=====================');
  next();
});

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// File upload configuration
let uploadsDir;
const projectUploadsDir = path.join(__dirname, "uploads");

// Try project directory first
try {
  if (!fs.existsSync(projectUploadsDir)) {
    fs.mkdirSync(projectUploadsDir, { recursive: true });
    console.log("Created uploads directory in project folder ✅");
  }
  
  // Test write permissions
  const testFile = path.join(projectUploadsDir, `permission-test-${Date.now()}.tmp`);
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  
  uploadsDir = projectUploadsDir;
  console.log("Using project uploads directory with write permissions ✅");
} catch (err) {
  console.error("Project uploads directory error:", err.message);
  
  // Fall back to system temp directory
  try {
    const tempUploadsDir = path.join(os.tmpdir(), 'my-project-uploads');
    if (!fs.existsSync(tempUploadsDir)) {
      fs.mkdirSync(tempUploadsDir, { recursive: true });
    }
    
    // Test temp directory permissions
    const testFile = path.join(tempUploadsDir, `permission-test-${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    uploadsDir = tempUploadsDir;
    console.log(`Using temporary directory for uploads: ${tempUploadsDir} ✅`);
  } catch (tempErr) {
    console.error("Temporary directory error:", tempErr.message);
    throw new Error("Could not establish a writable uploads directory");
  }
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + "-" + sanitizedFilename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "video/mp4"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and MP4 files are allowed!"), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mydatabases";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB Connection Error ❌:", err));
  // Add this route after your middleware and before other routes
// ✅ CRITICAL: Add these API routes BEFORE file upload config
app.get('/api', (req, res) => {
  console.log('📡 /api endpoint hit');
  res.json({ 
    message: '✅ Bingo API Server is running!',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: '/api/test',
      auth: {
        signup: '/api/auth/signup',
        login: '/login'
      },
      groups: '/api/groups'
    }
  });
});

app.get('/api/test', (req, res) => {
  console.log('📡 /api/test endpoint hit');
  res.json({ 
    message: '✅ Backend is working perfectly!',
    cors: 'CORS is configured correctly',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin
  });
});

// Simple signup route for testing
app.post('/api/auth/signup', (req, res) => {
  console.log('📝 Signup request received:', req.body);
  res.json({
    success: true,
    message: 'User registered successfully!',
    user: {
      id: Math.random().toString(36).substr(2, 9),
      username: req.body.username,
      email: req.body.email
    }
  });
});
// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findOne({ _id: decoded.id });

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Routes
app.use("/uploads", express.static(uploadsDir));

// Auth routes
app.post("/signup", upload.single("photo"), async (req, res) => {
  try {
    const { username, email, password, gender, age, name } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const photo = req.file ? `/uploads/${req.file.filename}` : "";
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword, 
      gender, 
      age, 
      photo,
      name
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully ✅" });
  } catch (error) {
    console.error("Signup Error ❌:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});
app.post('/api/groups/:groupId/set-card-limit', auth, async (req, res) => {
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

    // Check if the card limit is reached
    if (group.members.length >= cardLimit) {
      group.gameStarted = true;
      await group.save();
      console.log(`Game started for group ${groupId} as card limit was reached`);
    }

    res.json({ success: true, updatedGroup: group });
  } catch (error) {
    console.error('Error setting card limit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/api/groups/:groupId/call-number', async (req, res) => {
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
    const calledCombination = remainingCombinations[randomIndex];

    // Update the group with the called combination
    group.calledNumbers.push(calledCombination);
    await group.save();

    // Check for a winner
    const winner = group.bingoCards.find((card) =>
      Object.entries(card.numbers).every(([letter, numbers]) =>
        numbers.every((num) => group.calledNumbers.includes(`${letter}${num}`))
      )
    );

    if (winner) {
      return res.json({
        success: true,
        calledCombination,
        calledNumbers: group.calledNumbers,
        winner,
      });
    }

    res.json({ success: true, calledCombination, calledNumbers: group.calledNumbers });
  } catch (error) {
    console.error('Error calling number:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to check for a winner
async function checkWinner(group) {
  // Check each card to see if it matches all called numbers
  const winner = group.cards.find((card) =>
    Object.values(card.numbers).flat().every((num) => group.calledNumbers.includes(num))
  );

  return winner;
}
app.get('/api/groups/:groupId/user-cards', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(memberId => 
      memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Ensure bingoCards exists
    if (!group.bingoCards || group.bingoCards.length === 0) {
      return res.json({ cards: [] }); // Return an empty array if no cards exist
    }

    // Filter cards to only include those belonging to the current user
    const userCards = group.bingoCards.filter(card => 
      card.userId && card.userId.toString() === req.user._id.toString()
    );

    console.log('User cards:', userCards); // Debugging log

    res.json({ cards: userCards });
  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/api/groups/:groupId/start-game', auth, async (req, res) => {
  const { groupId } = req.params;
  const { bingoCards } = req.body;

  if (!bingoCards || bingoCards.length === 0) {
    return res.status(400).json({ message: 'No Bingo cards provided' });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Add userId to each card
    const cardsWithUser = bingoCards.map(card => ({
      ...card,
      userId: req.user._id
    }));

    group.bingoCards = cardsWithUser;
    group.gameStarted = true;
    group.calledNumbers = [];
    await group.save();

    res.json({ 
      success: true, 
      message: 'Game started successfully', 
      group: {
        ...group.toObject(),
        bingoCards: cardsWithUser // Return only the user's cards
      }
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/api/groups/:groupId/restart-game', auth, async (req, res) => {
  const { groupId } = req.params;

  // Validate groupId
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ message: 'Invalid group ID' });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Reset game-related fields
    group.gameStarted = false;
    group.calledNumbers = [];
    await group.save();

    res.json({ success: true, message: 'Game restarted successfully', group });
  } catch (error) {
    console.error('Error restarting game:', error); // Log the full error
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
app.get('/api/groups/:groupId/check-winner', auth, async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.bingoCards || group.bingoCards.length === 0) {
      return res.status(400).json({ message: 'No cards stored for this group' });
    }

    // Check all cards (admin can see all winners)
    const winner = group.bingoCards.find((card) =>
      Object.values(card.numbers).flat().every((num) => 
        group.calledNumbers.includes(num)
      )
    );

    if (winner) {
      // For non-admin users, only return if they are the winner
      if (!isCreator(group, req.user) && 
          winner.userId.toString() !== req.user._id.toString()) {
        return res.json({ success: false, message: 'No winner yet' });
      }

      return res.json({ 
        success: true, 
        winner: {
          _id: winner._id,
          userName: winner.userName,
          name: winner.userName,
          userEmail: winner.userEmail,
          userId: winner.userId
        }
      });
    }

    res.json({ success: false, message: 'No winner yet' });
  } catch (error) {
    console.error('Error checking winner:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to check if user is group creator

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.username,
        photo: user.photo ? `http://localhost:5000${user.photo}` : "/default-avatar.png",
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Group routes
app.post('/api/groups', auth, async (req, res) => {
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
        name: req.user.name || req.user.username
      }
    });
    
    const savedGroup = await group.save();
    
    // Populate the creator information
    const populatedGroup = await Group.findById(savedGroup._id)
      .populate('createdBy', 'username name email')
      .populate('members', 'username name email');
    
    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: error.message });
  }
});


app.get('/api/groups', auth, async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('members', 'username name email')
      .populate('createdBy', 'username name email');
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// GET a single group by ID
app.get('/api/groups/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'username name email')
      .populate('members', 'username name email');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );

    if (!isMember && group.isPrivate) {
      return res.status(403).json({ message: 'You do not have permission to view this group' });
    }

    // Filter cards to only include user's cards
    const userCards = group.bingoCards.filter(card => 
      card.userId && card.userId.toString() === req.user._id.toString()
    );

    res.json({
      ...group.toObject(),
      bingoCards: userCards
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Import groupRoutes and use it for /api/groups routes
const groupRoutes = require('./routes/groupRoutes');
app.use('/api/groups', groupRoutes);
// GET members of a group
app.get('/api/groups/:id/members', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username name email');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );

    if (!isMember && group.isPrivate) {
      return res.status(403).json({ message: 'You do not have permission to view this group' });
    }

    res.json(group.members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/groups/:groupId/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(memberId => 
      memberId.toString() === req.user._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    if (group.memberLimit > 0 && group.members.length >= group.memberLimit) {
      return res.status(400).json({ message: 'Group has reached member limit' });
    }

    group.members.push(req.user._id);
    await group.save();

    // Return populated group
    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'username name email')
      .populate('createdBy', 'username name email');

    res.json(populatedGroup);
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Error joining group' });
  }
});
app.post("/api/groups/:groupId/set-prize", auth, upload.single("prizeFile"), async (req, res) => {
  const { groupId } = req.params;
  const { prizeType, prizeAmount } = req.body;
  const prizeFile = req.file;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if the user is the group creator
    if (group.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group creator can set the prize" });
    }

    // Update the prize details
    group.prize = {
      type: prizeType,
      amount: prizeType === "money" ? prizeAmount : null,
      file: prizeFile ? `/uploads/${prizeFile.filename}` : null,
    };

    await group.save();

    res.status(200).json({ message: "Prize updated successfully", group });
  } catch (error) {
    console.error("Error setting prize:", error);
    res.status(500).json({ message: "Failed to set prize" });
  }
});
app.post('/api/groups/:groupId/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(memberId => 
      memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({ message: 'Not a member of this group' });
    }

    // Check if user is the creator
    if (group.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Creator cannot leave the group. Delete the group instead.' });
    }

    group.members = group.members.filter(memberId => 
      memberId.toString() !== req.user._id.toString()
    );
    
    await group.save();

    res.json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Error leaving group' });
  }
});
app.post('/api/groups/:groupId/set-timer', auth, async (req, res) => {
  const { groupId } = req.params;
  const { timer } = req.body;

  if (!timer || timer <= 0) {
    return res.status(400).json({ message: 'Invalid timer value' });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.timer = timer;
    await group.save();

    // Start the game after the timer expires
    setTimeout(async () => {
      group.gameStarted = true;
      await group.save();
      console.log(`Game started for group ${groupId}`);
    }, timer * 1000);

    res.json({ success: true, message: `Timer set to ${timer} seconds`, group });
  } catch (error) {
    console.error('Error setting timer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Root route - serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error", details: err.message });
});

// Enhanced server startup for GitHub Codespaces
const HOST = process.env.CODESPACE_NAME ? '0.0.0.0' : 'localhost';

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`✅ Test: http://localhost:${PORT}/api/test`);
  
  if (process.env.CODESPACE_NAME) {
    console.log(`🔗 Codespace URL: https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev`);
    console.log(`🔗 Codespace API: https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev/api`);
  }
  
  console.log(`✅ CORS configured for ALL origins`);
  console.log(`✅ Ready for frontend connections!`);
});

// Error handling to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});