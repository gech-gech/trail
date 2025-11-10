import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BingoGame.css";

function SimpleComponent({ user }) {
  const sliderRef = useRef(null);
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const location = useLocation();
  const [minPrice, setMinPrice] = useState(location.state?.groupPrice || 10);
  const navigate = useNavigate();

  // ✅ FIXED: Use your correct Codespace URL
  const API_BASE_URL = 'https://redesigned-meme-x5x4rjgr499ghpqw4-5000.app.github.dev';

  // ✅ FIXED: Enhanced user state management
  const [currentUser, setCurrentUser] = useState(null);

  // Load user from localStorage and fix URLs
  useEffect(() => {
    const loadAndFixUser = () => {
      try {
        const userJSON = localStorage.getItem('user');
        if (userJSON) {
          let userData = JSON.parse(userJSON);
          
          // ✅ FIX: Check if user data has localhost URLs and fix them
          if (userData.photo && userData.photo.includes('localhost:5000')) {
            console.log('🔄 Fixing user photo URL...');
            userData.photo = userData.photo.replace('http://localhost:5000', API_BASE_URL);
            // Update localStorage with fixed URL
            localStorage.setItem('user', JSON.stringify(userData));
          }
          
          // ✅ FIX: Check if token exists
          if (!userData.token) {
            console.error('❌ No token found in user data');
            // Try to get token from the user prop
            if (user?.token) {
              userData.token = user.token;
              localStorage.setItem('user', JSON.stringify(userData));
            } else {
              console.warn('⚠️ No token available, redirecting to login');
              navigate('/login');
              return;
            }
          }
          
          console.log('👤 Loaded user:', userData);
          setCurrentUser(userData);
        } else {
          console.warn('⚠️ No user found in localStorage');
          // If no user in localStorage but user prop exists, use it
          if (user) {
            console.log('👤 Using user from props');
            setCurrentUser(user);
          } else {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
        navigate('/login');
      }
    };

    loadAndFixUser();
  }, [navigate, user]);

  // ✅ FIXED: Enhanced photo URL handler
  const getProfilePhotoUrl = (photo) => {
    if (!photo) return null;
    
    console.log('🖼️ Original photo URL:', photo);
    
    // If photo is already a full HTTPS URL, return it
    if (photo.startsWith('https://')) {
      return photo;
    }
    
    // If photo has localhost:5000, replace it
    if (photo.includes('localhost:5000')) {
      const fixedUrl = photo.replace('http://localhost:5000', API_BASE_URL);
      console.log('🔄 Fixed localhost URL:', fixedUrl);
      return fixedUrl;
    }
    
    // If photo is a relative path starting with /uploads
    if (photo.startsWith('/uploads/')) {
      const fixedUrl = `${API_BASE_URL}${photo}`;
      console.log('🔄 Fixed relative URL:', fixedUrl);
      return fixedUrl;
    }
    
    // If it's just a filename without path
    if (photo && !photo.includes('/') && !photo.startsWith('http')) {
      const fixedUrl = `${API_BASE_URL}/uploads/${photo}`;
      console.log('🔄 Fixed filename URL:', fixedUrl);
      return fixedUrl;
    }
    
    // Return as is if we can't determine the format
    console.log('⚠️ Returning original URL (unable to fix):', photo);
    return photo;
  };

  // Initialize cards
  useEffect(() => {
    if (!currentUser) return;

    let userSelectedCards = [];
    if (location.state?.selectedCards) {
      userSelectedCards = location.state.selectedCards.filter(card => 
        card.userId === (currentUser?._id || currentUser?.id)
      );
    } else {
      const groupId = location.state?.groupId;
      if (groupId) {
        const savedCardsJSON = localStorage.getItem(`group-${groupId}-cards`);
        if (savedCardsJSON) {
          const savedCards = JSON.parse(savedCardsJSON);
          userSelectedCards = savedCards.filter(card => 
            card.userId === (currentUser?._id || currentUser?.id)
          );
        }
      }
    }
    
    const incomingCardIds = userSelectedCards.map(card => card.id);
    setSelectedCards(incomingCardIds);

    setCards(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const newCards = userSelectedCards.filter(card => !existingIds.has(card.id));
      return [...prev, ...newCards];
    });

    generateCards(50);
  }, [location.state, currentUser]);

  function generateCard() {
    const headers = ["B", "I", "N", "G", "O"];
    const ranges = {
      B: [[46, 60]],
      I: [[16, 30]],
      N: [[31, 45]],
      G: [[1, 15]],
      O: [[61, 75]],
    };
    
    let card = headers.map((key) => {
      let allNumbers = [];
      ranges[key].forEach(([min, max]) => {
        const rangeNumbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);
        allNumbers.push(...rangeNumbers);
      });
      
      allNumbers.sort(() => Math.random() - 0.5);
      const selectedNumbers = allNumbers.slice(0, 5);
      
      return [key, ...selectedNumbers];
    });

    return {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      numbers: card,
      selectedAt: new Date().toISOString()
    };
  }

  function generateCards(count) {
    const newCards = Array.from({ length: count }, generateCard);
    setCards((prev) => {
      const filteredNewCards = newCards.filter(card => !selectedCards.includes(card.id));
      const existingIds = new Set(prev.map(c => c.id));
      const uniqueNewCards = filteredNewCards.filter(card => !existingIds.has(card.id));
      return [...prev, ...uniqueNewCards];
    });
  }

  function toggleCardSelection(cardId) {
    if (selectedCards.includes(cardId)) {
      setSelectedCards((prev) => prev.filter(id => id !== cardId));
      const groupId = location.state?.groupId;
      if (groupId) {
        const saved = localStorage.getItem(`group-${groupId}-cards`);
        let savedCards = [];
        if (saved) {
          try {
            savedCards = JSON.parse(saved);
          } catch {}
        }
        savedCards = savedCards.filter(card => card.id !== cardId);
        localStorage.setItem(`group-${groupId}-cards`, JSON.stringify(savedCards));
      }
    } else {
      setSelectedCards((prev) => {
        const newSelected = [...prev, cardId];
        const groupId = location.state?.groupId;
        if (groupId) {
          const saved = localStorage.getItem(`group-${groupId}-cards`);
          let savedCards = [];
          if (saved) {
            try {
              savedCards = JSON.parse(saved);
            } catch {}
          }
          if (!savedCards.some(card => card.id === cardId)) {
            const cardToAdd = cards.find(card => card.id === cardId);
            if (cardToAdd) {
              savedCards.push(cardToAdd);
            }
          }
          localStorage.setItem(`group-${groupId}-cards`, JSON.stringify(savedCards));
        }
        return newSelected;
      });
    }
  }

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    let initials = parts[0][0];
    if (parts.length > 1) initials += parts[parts.length - 1][0];
    return initials.toUpperCase();
  };

const handleSelectClick = async () => {
  if (!currentUser || !currentUser.token) {
    console.error('❌ User not authenticated:', currentUser);
    alert('Please login again. Your session may have expired.');
    navigate('/login');
    return;
  }

  if (selectedCards.length === 0) {
    alert('Please select at least one card');
    return;
  }

  const selectedCardData = cards.filter((card) =>
    selectedCards.includes(card.id)
  );

  const userId = currentUser?._id || currentUser?.id || null;
  
  // ✅ FIX: Include all required fields for the Group model
  const cardsWithUserId = selectedCardData.map((card) => {
    // Convert card numbers to the format expected by backend
    let numbers;
    if (Array.isArray(card.numbers)) {
      // Convert from array format to object format
      numbers = {
        B: card.numbers[0]?.slice(1) || [],
        I: card.numbers[1]?.slice(1) || [],
        N: card.numbers[2]?.slice(1) || [],
        G: card.numbers[3]?.slice(1) || [],
        O: card.numbers[4]?.slice(1) || []
      };
    } else {
      numbers = card.numbers;
    }

    return {
      id: card.id,
      numbers: numbers,
      selectedAt: new Date().toISOString(),
      userId: userId,
      userName: currentUser.name,
      userEmail: currentUser.email,
      // ✅ ADD: Required fields for Group model validation
      groupName: location.state?.groupName || 'Bingo Group',
      groupId: location.state?.groupId,
      cardName: `Card-${card.id.slice(-6)}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  if (location.state?.fromGroup) {
    try {
      console.log('🔄 Adding cards to group...');
      console.log('Group ID:', location.state.groupId);
      console.log('Cards data being sent:', JSON.stringify(cardsWithUserId, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/groups/${location.state.groupId}/add-card`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cards: cardsWithUserId }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error details:', errorData);
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Cards added successfully:', data);

      alert(`Cards added successfully to the group! Added ${data.addedCount} cards.`);
      
      // Redirect to GroupPage after successful add
      navigate(`/groups/${location.state.groupId}`);
    } catch (error) {
      console.error('❌ Error adding cards to the group:', error);
      alert(`Failed to add cards: ${error.message}`);
    }
  } else {
    // Handle non-group card selection
    alert(`Selected ${selectedCards.length} cards!`);
  }
};
  // Show loading state while user is being loaded
  if (!currentUser) {
    return (
      <div className="bingo-game">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading user data...</p>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ marginTop: '20px', padding: '10px 20px' }}
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bingo-game">
      <header className="header">
        <div className="profile-section">
          <div className="profile">
            {currentUser?.photo ? (
              <img 
                src={getProfilePhotoUrl(currentUser.photo)} 
                alt="Profile" 
                onError={(e) => {
                  console.error('❌ Failed to load profile image:', e.target.src);
                  e.target.style.display = 'none';
                }}
                onLoad={() => console.log('✅ Profile image loaded successfully')}
              />
            ) : null}
            <div className="avatar-fallback">{getInitials(currentUser?.name)}</div>
            <h2>{currentUser?.name ? currentUser.name.toUpperCase() : "USER"}</h2>
          </div>
        </div>
        <div className="title-section">
          <h1>Bingo</h1>
        </div>
      </header>

      <div className="card-container">
        <h2>Your Bingo Cards</h2>
        <div className="slider-container">
          <button className="slider-button" onClick={() => sliderRef.current.scrollLeft -= 200}>
            {"<"}
          </button>
          <div className="slider" ref={sliderRef}>
            {cards.map((card) => (
              <div
                key={card.id}
                className={`bingo-card ${selectedCards.includes(card.id) ? "selected" : ""}`}
                onClick={() => toggleCardSelection(card.id)}
              >
                {Array.isArray(card.numbers) ? (
                  card.numbers.map((column, i) => (
                    <div key={i} className="column">
                      {column.map((num, j) => (
                        <div key={j} className={j === 0 ? "header-cell" : "cell"}>
                          {num}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <p>Invalid card data</p>
                )}
              </div>
            ))}
          </div>
          <button className="slider-button" onClick={() => sliderRef.current.scrollLeft += 200}>
            {">"}
          </button>
        </div>
        <div className="selection-summary">
          <div className="selected-count-box">
            <span>Selected: {selectedCards.length}</span>
            <span>Total: ${minPrice * selectedCards.length}</span>
          </div>
          <button
            className="bet-button"
            onClick={handleSelectClick}
            disabled={selectedCards.length === 0}
          >
            {location.state?.fromGroup ? "Add to Group" : "Select Cards"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SimpleComponent;