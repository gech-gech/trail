const mongoose = require('mongoose');

const bingoItemSchema = mongoose.Schema({
    text: { type: String, required: true },
    isFree: { type: Boolean, default: false },
    isChecked: { type: Boolean, default: false },
});

const bingoCardSchema = mongoose.Schema({
    groupName: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    numbers: {
        B: [{ type: Number, required: true, min: 1, max: 75 }],
        I: [{ type: Number, required: true, min: 1, max: 75 }],
        N: [{ type: Number, required: true, min: 1, max: 75 }],
        G: [{ type: Number, required: true, min: 1, max: 75 }],
        O: [{ type: Number, required: true, min: 1, max: 75 }],
    },
});

const groupSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        createdBy: {
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true },
        },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        price: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        memberLimit: { type: Number, default: 0 }, // 0 for unlimited
        isPrivate: { type: Boolean, default: false },
        bingoCards: [bingoCardSchema],
        calledNumbers: [{ type: String }], // e.g., "B1", "I25"
        gameStarted: { type: Boolean, default: false },
        currentGameNumber: { type: Number, default: 0 },

        // Updated fields for prize management
        prize: {
            type: {
                type: String, // 'money', 'photo', or 'video'
                enum: ['money', 'photo', 'video'], // Allowed prize types
                default: null, // Default to no prize type
            },
            amount: { type: Number, default: 0 }, // Default prize amount
            file: { type: String, default: null }, // Default to no file
        },
    },
    { timestamps: true } // Enable timestamps for createdAt and updatedAt
);

// Add indexes for performance
groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;