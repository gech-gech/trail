import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BingoGame.css";
import API_BASE_URL from './config';

function SimpleComponent({ user }) {
  const sliderRef = useRef(null);
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const location = useLocation();
  const [minPrice, setMinPrice] = useState(location.state?.groupPrice || 10);
  const navigate = useNavigate();

  // Initialize with any previously selected cards from location state or localStorage filtered by userId
  useEffect(() => {
    let userSelectedCards = [];
    if (location.state?.selectedCards) {
      userSelectedCards = location.state.selectedCards.filter(card => card.userId === (user?._id || user?.id));
    } else {
      // Try to load from localStorage
      const groupId = location.state?.groupId;
      if (groupId) {
        const savedCardsJSON = localStorage.getItem(`group-${groupId}-cards`);
        if (savedCardsJSON) {
          const savedCards = JSON.parse(savedCardsJSON);
          userSelectedCards = savedCards.filter(card => card.userId === (user?._id || user?.id));
        }
      }
    }
    // Set selected cards IDs
    const incomingCardIds = userSelectedCards.map(card => card.id);
    setSelectedCards(incomingCardIds);

    // Also set these cards in the cards state if they're not already there
    setCards(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const newCards = userSelectedCards.filter(card => !existingIds.has(card.id));
      return [...prev, ...newCards];
    });

    generateCards(50);
  }, [location.state, user]);
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
    // Combine all numbers from all ranges for this column
    let allNumbers = [];
    ranges[key].forEach(([min, max]) => {
      const rangeNumbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);
      allNumbers.push(...rangeNumbers);
    });
    
    // Shuffle all available numbers
    allNumbers.sort(() => Math.random() - 0.5);
    
    // Take first 5 numbers
    const selectedNumbers = allNumbers.slice(0, 5);
    
    return [key, ...selectedNumbers];
  });

  // Add a unique ID to each card
  return {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    numbers: card,
    selectedAt: new Date().toISOString()
  };
}

  function generateCards(count) {
    const newCards = Array.from({ length: count }, generateCard);
    setCards((prev) => {
      // Filter out cards that are already selected by the user
      const filteredNewCards = newCards.filter(card => !selectedCards.includes(card.id));
      // Also filter out cards already in prev to avoid duplicates
      const existingIds = new Set(prev.map(c => c.id));
      const uniqueNewCards = filteredNewCards.filter(card => !existingIds.has(card.id));
      return [...prev, ...uniqueNewCards];
    });
  }

  function toggleCardSelection(cardId) {
    // Prevent selecting a card that was previously selected (already in selectedCards)
    if (selectedCards.includes(cardId)) {
      // If already selected, allow deselecting
      setSelectedCards((prev) => prev.filter(id => id !== cardId));
      // Update localStorage accordingly
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
      // Allow selecting only if not previously selected
      setSelectedCards((prev) => {
        const newSelected = [...prev, cardId];
        // Update localStorage as well
        const groupId = location.state?.groupId;
        if (groupId) {
          const saved = localStorage.getItem(`group-${groupId}-cards`);
          let savedCards = [];
          if (saved) {
            try {
              savedCards = JSON.parse(saved);
            } catch {}
          }
          // Add the newly selected card to savedCards if not already present
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

  // Update your handleSelectClick function



  const handleSelectClick = async () => {
    if (selectedCards.length === 0) {
      alert('Please select at least one card');
      return;
    }
  
    const selectedCardData = cards.filter((card) =>
      selectedCards.includes(card.id)
    );
  
    const userId = user?._id || user?.id || null;
    const cardsWithUserId = selectedCardData.map((card) => ({
      ...card,
      selectedAt: new Date().toISOString(),
      userId: userId,
    }));
  
    if (location.state?.fromGroup) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/groups/${location.state.groupId}/add-card`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cards: cardsWithUserId }),
        });
  
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Unexpected response from the server');
        }
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || 'Failed to add cards to the group');
        }
  
        alert('Cards added successfully to the group!');
        // Redirect to GroupPage after successful add
        window.location.href = `/groups/${location.state.groupId}`;
      } catch (error) {
        console.error('Error adding cards to the group:', error);
        alert(error.message || 'Failed to add cards to the group');
      }
    }
  };

  return (
    <div className="bingo-game">
      <header className="header">
        <div className="profile-section">
          <div className="profile">
            {user?.photo ? (
              <img src={user.photo} alt="Profile" />
            ) : (
              <div className="avatar-fallback">{getInitials(user?.name)}</div>
            )}
            <h2>{user?.name ? user.name.toUpperCase() : "USER"}</h2>
          </div>
        </div>
        <div className="title-section">
          <h1>Bingo</h1>
        </div>
      </header>

      <div className="card-container">
        <h2>Your Bingo Cards</h2>
        <div className="slider-container">
          <button
            className="slider-button"
            onClick={() => {
              sliderRef.current.scrollLeft -= 200;
            }}
          >
            {"<"}
          </button>
          <div className="slider" ref={sliderRef}>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className={`bingo-card ${
                      selectedCards.includes(card.id) ? "selected" : ""
                    }`}
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
                    ) : typeof card.numbers === 'object' && card.numbers !== null ? (
                      ['B', 'I', 'N', 'G', 'O'].map((letter) => {
                        const columnNumbers = card.numbers[letter];
                        if (!Array.isArray(columnNumbers)) {
                          return <p key={`invalid-${letter}`}>Invalid card data</p>;
                        }
                        return (
                          <div key={letter} className="column">
                            <div className="cell header-cell" key={`header-${letter}`}>{letter}</div>
                            {columnNumbers.map((num, j) => (
                              <div key={`${letter}-${j}`} className="cell">
                                {num}
                              </div>
                            ))}
                          </div>
                        );
                      })
                    ) : (
                      <p>Invalid card data</p>
                    )}
                  </div>
                ))}
          </div>
          <button
            className="slider-button"
            onClick={() => {
              sliderRef.current.scrollLeft += 200;
            }}
          >
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