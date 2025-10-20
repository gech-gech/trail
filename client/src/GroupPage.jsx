import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GroupPage.css';

const GroupPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [markedNumbers, setMarkedNumbers] = useState({});
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [liveMembers, setLiveMembers] = useState([]);
  const [numberCallingMechanism, setNumberCallingMechanism] = useState('manual');
  const [cardLimitInput, setCardLimitInput] = useState(group?.cardLimit || 0);
  const [showCardLimitInput, setShowCardLimitInput] = useState(false);
  const [timerInput, setTimerInput] = useState(0);
  const [showTimerInput, setShowTimerInput] = useState(false);
  const [timerCountdown, setTimerCountdown] = useState(0);
  const [winnerDeclared, setWinnerDeclared] = useState(false);
  const [winnerDetails, setWinnerDetails] = useState(null);
  const [showPrizeAnimation, setShowPrizeAnimation] = useState(false);
 const [prizeType, setPrizeType] = useState('money'); // Default prize type
const [prizeAmount, setPrizeAmount] = useState(0); // For money prize
const [showPrizeOptions, setShowPrizeOptions] = useState(false); // Toggle prize options
const [finalPrize, setFinalPrize] = useState(0); // Final 
const [prizePhoto, setPrizePhoto] = useState(null); // For photo prize
const [prizeVideo, setPrizeVideo] = useState(null);
  const handleLeaveGroup = async () => {
    if (!user?.token) {
      setError('You must be logged in to leave the group');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to leave group');
      }

      alert('You have successfully left the group');
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      setError(error.message || 'Failed to leave group');
    }
  };
const handleSetPrize = async () => {
  if (!prizeType) {
    alert('Please select a prize type.');
    return;
  }

  const formData = new FormData();
  formData.append('prizeType', prizeType);

  if (prizeType === 'money') {
    formData.append('prizeAmount', prizeAmount);
  } else if (prizeType === 'photo' && prizePhoto) {
    formData.append('prizeFile', prizePhoto);
  } else if (prizeType === 'video' && prizeVideo) {
    formData.append('prizeFile', prizeVideo);
  } else if (prizeType === 'auto') {
    const calculatedPrize = group.price * (members.length || 1);
    formData.append('prizeAmount', calculatedPrize);
  } else {
    alert('Please upload a valid file for the prize.');
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/groups/${groupId}/set-prize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to set prize');
    }

    alert('Prize set successfully!');
    setShowPrizeOptions(false); // Hide the options after saving
  } catch (error) {
    console.error('Error setting prize:', error);
    setError(error.message || 'Failed to set prize');
  }
};
useEffect(() => {
  if (user?.token) {
    fetchUserCards();
  }
}, [user, groupId]);
  useEffect(() => {
    const fetchUserCards = async () => {
      if (!user?.token) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/groups/${groupId}/user-cards`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSelectedCards(data.cards || []);
          localStorage.setItem(`group-${groupId}-cards`, JSON.stringify(data.cards || []));
        }
      } catch (error) {
        console.error('Error fetching user cards:', error);
      }
    };

    const handleStateChange = (event) => {
      const state = event?.state || window.history.state;
      if (state?.selectedCards) {
        setSelectedCards(state.selectedCards);
        localStorage.setItem(`group-${groupId}-cards`, JSON.stringify(state.selectedCards));
      }
    };

    handleStateChange();

    if (!window.history.state?.selectedCards) {
      const savedCards = localStorage.getItem(`group-${groupId}-cards`);
      if (savedCards) {
        setSelectedCards(JSON.parse(savedCards));
      } else {
        fetchUserCards();
      }
    }

    window.addEventListener('popstate', handleStateChange);
    return () => window.removeEventListener('popstate', handleStateChange);
  }, [groupId, user?.token]);

  const fetchGroupDetails = useCallback(async (token, isBackgroundFetch = false) => {
    if (!isBackgroundFetch) setLoading(true);

    try {
      const listResponse = await fetch('http://localhost:5000/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        const groups = Array.isArray(listData) ? listData : (listData.groups || []);
        const currentGroup = groups.find(g => g._id === groupId);
        if (currentGroup) {
          setGroup(currentGroup);
          if (currentGroup.calledNumbers) {
            setCalledNumbers(currentGroup.calledNumbers);
          }
          fetchGroupMembers(token);
        } else {
          setError('Group not found');
        }
      } else {
        setError('Failed to fetch groups');
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      setError('Failed to fetch group details');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    const fetchUserAndGroup = async () => {
      const userJSON = localStorage.getItem('user');
      if (!userJSON) {
        navigate('/login');
        return;
      }
      try {
        const parsedUser = JSON.parse(userJSON);
        setUser(parsedUser);

        const groupsJSON = localStorage.getItem('groups');
        if (groupsJSON) {
          try {
            const groups = JSON.parse(groupsJSON);
            const cachedGroup = groups.find(g => g._id === groupId);
            if (cachedGroup) {
              setGroup(cachedGroup);
              if (cachedGroup.calledNumbers) {
                setCalledNumbers(cachedGroup.calledNumbers);
              }
              fetchGroupDetails(parsedUser.token, true);
              return;
            }
          } catch (e) {
            console.error('Error parsing groups from localStorage:', e);
          }
        }
        await fetchGroupDetails(parsedUser.token);
      } catch (error) {
        console.error('Error in fetchUserAndGroup:', error);
        setError('Failed to load group details. Please try again later.');
        setLoading(false);
      }
    };
    fetchUserAndGroup();
  }, [groupId, navigate, fetchGroupDetails]);

  const fetchGroupMembers = useCallback(async (token) => {
    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return setMembers([]);
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : data.members || []);
    } catch {
      setMembers([]);
    }
  }, [groupId]);

  // Poll group members every 5 seconds to refresh members list
  useEffect(() => {
    if (!user?.token) return;
    const interval = setInterval(() => {
      fetchGroupMembers(user.token);
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.token, fetchGroupMembers]);

  // Poll called numbers every 3 seconds to refresh called numbers list
  useEffect(() => {
    if (!user?.token) return;
    const fetchCalledNumbers = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/groups/${groupId}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.calledNumbers) {
          setCalledNumbers(data.calledNumbers);
        }
      } catch (error) {
        console.error('Error fetching called numbers:', error);
      }
    };
    const interval = setInterval(fetchCalledNumbers, 1000);
    return () => clearInterval(interval);
  }, [user?.token, groupId]);

  // Reusable countdown function for timer mechanism
  useEffect(() => {
    let countdown;
    if (numberCallingMechanism === 'time-based' && timerInput > 0) {
      setTimerCountdown(timerInput);
      let remainingTime = timerInput;
      countdown = setInterval(() => {
        remainingTime -= 1;
        setTimerCountdown(remainingTime);
        setTimerInput(remainingTime);

        if (remainingTime <= 0) {
          clearInterval(countdown);
        }
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [numberCallingMechanism, timerInput]);

  // Combined useEffect for number calling mechanisms
  useEffect(() => {
    let interval;
    if ((numberCallingMechanism === 'time-based' || numberCallingMechanism === 'card-limit')) {
      interval = setInterval(() => {
        handleCallNumber();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [numberCallingMechanism]);

  // Card limit check and auto start
  useEffect(() => {
    if (numberCallingMechanism === 'card-limit' && group?.cardLimit) {
      const checkCardLimit = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/groups/${groupId}/check-card-limit`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          if (data.gameStarted) {
            alert('The game has started automatically!');
            handleCallNumber();
          }
        } catch (error) {
          console.error('Error checking card limit:', error);
        }
      };

      const interval = setInterval(checkCardLimit, 1000);
      return () => clearInterval(interval);
    }
  }, [numberCallingMechanism, group, group?.cardLimit, groupId, user?.token]);

  const isCreator = () => {
    if (!user || !group || !group.createdBy) return false;
    const userId = user._id || user.id;
    const creatorId = typeof group.createdBy === 'object'
      ? group.createdBy._id || group.createdBy.id
      : group.createdBy;
    return userId === creatorId;
  };

  const checkWinner = useCallback(async () => {
    if (!user?.token || winnerDeclared) return;
    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/check-winner`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check winner');
      }
      
      const data = await response.json();
      
      if (data.success && data.winner) {
        setWinnerDeclared(true);
        const winnerName = data.winner.name || data.winner.username || 'Unknown Winner';
        setWinnerDetails({ 
          name: winnerName, 
          cardId: data.winner._id,
          email: data.winner.userEmail
        });
      }
    } catch (error) {
      console.error('Error checking winner:', error);
      setError(error.message || 'Failed to check winner');
    }
  }, [groupId, user?.token, winnerDeclared]);

  const handleRestartGame = async () => {
    if (!user?.token) {
      setError('You must be logged in to restart the game');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/restart-game`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restart game');
      }

      const data = await response.json();
      alert('Game restarted successfully!');
      setCalledNumbers([]);
      await fetchGroupDetails(user.token);
    } catch (error) {
      console.error('Error restarting game:', error);
      setError(error.message || 'Failed to restart game');
    }
  };

  const winnerDeclaredRef = useRef(false);



  const handleMechanismChange = (e) => {
    const selectedMechanism = e.target.value;
    setNumberCallingMechanism(selectedMechanism);
    setError('');
    setTimerInput(0);
    setTimerCountdown(0);
    setCardLimitInput(0);
    setShowTimerInput(selectedMechanism === 'time-based');
    setShowCardLimitInput(selectedMechanism === 'card-limit');
  };

  const handleSetTimer = async () => {
    if (!user?.token) {
      setError('You must be logged in to set the timer');
      return;
    }

    if (timerInput <= 0) {
      setError('Please set a valid timer value');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/set-timer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timer: timerInput }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to set timer');
      }

      alert(`Game will start in ${timerInput} seconds!`);
      setTimerCountdown(timerInput);
    } catch (error) {
      console.error('Error setting timer:', error);
      setError(error.message || 'Failed to set timer');
    }
  };

  const handleSetCardLimit = async () => {
    if (!user?.token) {
      setError('You must be logged in to set the card limit');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/set-card-limit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardLimit: cardLimitInput }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to set card limit');
      }

      const updatedGroup = await response.json();
      setGroup(updatedGroup);
      setShowCardLimitInput(false);
      alert('Card limit set successfully!');
    } catch (error) {
      console.error('Error setting card limit:', error);
      setError(error.message || 'Failed to set card limit');
    }
  };

  const handleAddCard = () => {
    navigate(`/simple`, {
      state: {
        selectedCards: selectedCards,
        fromGroup: true,
        groupId: groupId,
        groupPrice: group ? group.price : 10
      }
    });
  };

  const handleClearCards = async () => {
    if (!user?.token) {
      setError('You must be logged in to clear the cards');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/clear-bingo-cards`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear bingo cards');
      }

      const data = await response.json();
      alert(data.message);
      setSelectedCards([]);
      localStorage.setItem(`group-${groupId}-cards`, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing bingo cards:', error);
      setError(error.message || 'Failed to clear bingo cards');
    }
  };

  const toggleNumber = (cardIndex, number) => {
    setMarkedNumbers(prev => {
      const key = `card-${cardIndex}`;
      const markedSet = new Set(prev[key] || []);
      if (markedSet.has(number)) markedSet.delete(number);
      else markedSet.add(number);
      return { ...prev, [key]: Array.from(markedSet) };
    });
  };

  const isNumberMarked = (cardIndex, number) => {
    return calledNumbers.includes(number);
  };

  const isMemberLive = (memberId) => {
    return liveMembers.includes(memberId);
  };

  const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'USD':
      default: return '$';
    }
  };
const fetchUserCards = async () => {
  try {
    const response = await fetch(`http://localhost:5000/api/groups/${groupId}/user-cards`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user cards');
    }

    const data = await response.json();
    console.log('Fetched user cards:', data.cards); // Debugging log
    setSelectedCards(data.cards); // Update the state with the user's cards
  } catch (error) {
    console.error('Error fetching user cards:', error);
    setError(error.message || 'Failed to fetch user cards');
  }
};
const handleCallNumber = async () => {
  if (winnerDeclared) {
    console.log('Winner already declared. Stopping further calls.');
    return;
  }

  if (!user?.token) {
    setError('You must be logged in to call a number');
    return;
  }

  if (!group || !group._id) {
    setError('Group details not loaded');
    return;
  }

  if (!isCreator()) {
    setError('Only the group creator can call numbers');
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/groups/${groupId}/call-number`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to call number');
    }

    console.log('Number called:', data.calledNumber);

    // Update the calledNumbers state with the new list from the backend
    setCalledNumbers(data.calledNumbers);

    // Check if a winner is declared
    if (data.winner) {
      setWinnerDeclared(true);
      const winnerName = data.winner.name || data.winner.userName || 'Unknown Winner';
      setWinnerDetails({
        name: winnerName,
        cardId: data.winner._id,
        email: data.winner.userEmail,
      });

      // Stop further number calls
      alert(`🎉 We have a winner! Congratulations ${winnerName}! 🎉`);
    }
  } catch (error) {
    console.error('Error calling number:', error);
    setError(error.message || 'Failed to call number');
  }
};

  if (loading) {
    return (
      <div className="group-page loading">
        <div className="spinner"></div>
        <p>Loading group details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-page error">
        <h2>Error Loading Group</h2>
        <p>{error}</p>
        {error.includes('Unauthorized') && <button onClick={() => navigate('/login')}>Login</button>}
        <button onClick={() => navigate('/groups')}>Back to Groups</button>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-page not-found">
        <h2>Group Not Found</h2>
        <p>This group doesn't exist or you don't have access.</p>
        <div className="action-buttons">
          <button onClick={() => navigate('/groups')}>Browse Groups</button>
          <button onClick={() => navigate('/home')}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-page-container">
     {showPrizeAnimation && (
      <div className="prize-animation">
        <div className="confetti"></div>
        <h1 className="winner-announcement">🎉 Congratulations {winnerDetails?.name || 'Winner'}! 🎉</h1>
      </div>
    )}
      <div className="group-main-content">
        <div className="group-header">
          <div className="group-title-section">
            <h1>{group.name}</h1>
            {group.isPrivate && <span className="private-badge">Private</span>}
          </div>
          <div className="group-meta">
            <div className="prize-board">
  <div className="prize-board-title">Prize Pool</div>
            <div className="prize-board-amount">
              {getCurrencySymbol(group.currency)}
              {group.prize && group.prize.amount
                ? group.prize.amount
                : group.bingoCards && group.bingoCards.length > 0
                ? group.price * group.bingoCards.length
                : group.price * (members.length || 1)}
            </div>
            <div className="prize-board-members">
              ({members.length} member{members.length !== 1 ? 's' : ''} playing)
            </div>
            {group.prize && group.prize.type === 'photo' && group.prize.file && (
              <div className="prize-media">
                <img
                  src={`/uploads/prizes/${group.prize.file || group.prize.filename}`}
                  alt="Prize"
                  className="prize-image"
                />
              </div>
            )}
            {group.prize && group.prize.type === 'video' && group.prize.file && (
              <div className="prize-media">
                <video controls className="prize-video-player">
                  <source src={`/uploads/prizes/${group.prize.file || group.prize.filename}`} type={group.prize.mimetype} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {isCreator() && (
            <div className="prize-management">
              <button
                className="toggle-prize-button"
                onClick={() => setShowPrizeOptions((prev) => !prev)}
              >
                Set Prize
              </button>
              {showPrizeOptions && (
                <div className="prize-options">
                  <label htmlFor="prizeType">Prize Type:</label>
                  <select
                    id="prizeType"
                    value={prizeType}
                    onChange={(e) => setPrizeType(e.target.value)}
                  >
                    <option value="money">Money</option>
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                    <option value="auto">Auto (Cards × Min Amount)</option>
                  </select>
  
                  {prizeType === 'money' && (
                    <div className="prize-money">
                      <label htmlFor="prizeAmount">Enter Prize Amount:</label>
                      <input
                        type="number"
                        id="prizeAmount"
                        value={prizeAmount}
                        onChange={(e) => setPrizeAmount(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                  )}
  
                  {prizeType === 'photo' && (
                    <div className="prize-photo">
                      <label htmlFor="prizePhoto">Upload Prize Photo:</label>
                      <input
                        type="file"
                        id="prizePhoto"
                        accept="image/*"
                        onChange={(e) => setPrizePhoto(e.target.files[0])}
                      />
                    </div>
                  )}
  
                  {prizeType === 'video' && (
                    <div className="prize-video">
                      <label htmlFor="prizeVideo">Upload Prize Video:</label>
                      <input
                        type="file"
                        id="prizeVideo"
                        accept="video/*"
                        onChange={(e) => setPrizeVideo(e.target.files[0])}
                      />
                    </div>
                  )}
  
                  <button onClick={handleSetPrize} className="save-prize-button">
                    Save Prize
                  </button>
                </div>
              )}
            </div>
            )}
</div>
            <div className="group-price">
              <span className="label">Minimum Amount:</span>
              <span className="value">{getCurrencySymbol(group.currency)}{group.price}</span>
            </div>
          </div>

          {isCreator() && (
            <div className="form-group">
              <label htmlFor="numberCallingMechanism">Number Calling Mechanism:</label>
              <select
                id="numberCallingMechanism"
                value={numberCallingMechanism}
                onChange={handleMechanismChange}
              >
                <option value="time-based">Automatic (Time-Based)</option>
                <option value="card-limit">Card Limit</option>
                <option value="manual">Manual (Creator Calls)</option>
              </select>
            </div>
          )}
          {showTimerInput && isCreator() && (
            <div className="timer-input">
              <label htmlFor="timer">Set Timer (in seconds):</label>
              <input
                type="number"
                id="timer"
                value={timerInput}
                onChange={(e) => setTimerInput(Number(e.target.value))}
                min="1"
              />
              <button onClick={() => handleSetTimer()}>Set Timer</button>
              <div>Time remaining: {timerCountdown} seconds</div>
            </div>
          )}

          {showCardLimitInput && isCreator() && (
            <div className="card-limit-input">
              <label htmlFor="cardLimit">Set Card Limit:</label>
              <input
                type="number"
                id="cardLimit"
                value={cardLimitInput}
                onChange={(e) => setCardLimitInput(Number(e.target.value))}
                min="1"
              />
              <button onClick={() => handleSetCardLimit()}>Set Limit</button>
            </div>
          )}
          {isCreator() && (
            <>
              <div className="card-count">
                                       Number of Cards {group?.bingoCards ? group.bingoCards.length : 0}
              </div>
              <button onClick={handleRestartGame} className="restart-button">
                Restart Game
              </button>
            </>
          )}
        </div>

        {members.some((member) => member._id?.toString() === user?._id?.toString()) && !group.gameStarted && (
          <>
            <button className="add-card-button" onClick={handleAddCard}>
              Add Card
            </button>
            <button className="clear-card-button" onClick={handleClearCards}>Clear</button>
          </>
        )}

        <div className="circle-container">
          <div className={`circle ${calledNumbers.length > 0 ? 'has-numbers' : 'empty'}`}>
            {calledNumbers.length > 0 ? (
              <div className="called-numbers-list">
                <span className="called-number">{calledNumbers[calledNumbers.length - 1]}</span>
              </div>
            ) : (
              <p></p>
            )}
            <div className="segment"></div>
            <div className="inner-dots"></div>
          </div>
        </div>
<div className="cards-container" style={{ marginTop: '20px' }}>
  {selectedCards.length > 0 ? (
    selectedCards.map((card, cardIndex) => (
      <div key={cardIndex} className="bingo-card">
        {card.numbers && typeof card.numbers === 'object' && !Array.isArray(card.numbers) ? (
          ['B', 'I', 'N', 'G', 'O'].map((letter) => (
            <div key={letter} className="column">
              <div className="cell header-cell">{letter}</div>
              {Array.isArray(card.numbers[letter]) ? (
                card.numbers[letter].map((num, j) => (
                  <div
                    key={j}
                    className={`cell ${
                      calledNumbers.includes(`${letter}${num}`)
                        ? 'marked'
                        : winnerDeclared
                        ? 'unmarked'
                        : ''
                    }`}
                  >
                    {num}
                  </div>
                ))
              ) : (
                <p>Invalid card data</p>
              )}
            </div>
          ))
        ) : (
          <p>Invalid card data</p>
        )}
      </div>
    ))
  ) : (
    <p>No cards selected yet</p>
  )}
</div>
      </div>

      <div className="members-sidebar">
        <h2 className="members-header">Members  
          <span style={{ color: 'white', marginLeft: "50%" }}>
            {members.length}  {group.memberLimit > 0 ? `/ ${group.memberLimit}` : ''}
          </span>
        </h2>

        {members.length === 0 ? (
          <p>No members found.</p>
        ) : (
          <ul className="members-list">
            {members.map(member => (
              <li key={member._id || Math.random()} className="member-item">
                <div className="member-avatar">
                  {member.avatar ? (
                    <img src={member.avatar} alt={`${member.name}'s avatar`} />
                  ) : (
                    <div className="default-avatar">
                      {(member.name || member.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="member-info">
                  <span className="member-name">
                    {member.name || member.username || 'Unknown User'}
                    {(member._id === (user?._id || user?.id)) && ' (You)'}
                    {(member._id === (typeof group.createdBy === 'object' ? group.createdBy?._id : group.createdBy)) && (
                      <span style={{ color: '#4299e1', marginLeft: '3.5rem' }}>👨‍🎨Creator</span>
                    )}
                  </span>

                  {isMemberLive(member._id || member.id) && (
                    <span className="live-status-indicator">● Live</span>
                  )}
                  {member.joinedAt && (
                    <span className="member-joined">
                      Joined: {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <button className="leave-group-button" onClick={handleLeaveGroup}>Leave Group</button>
      </div>
    </div>
  );
};

export default GroupPage;