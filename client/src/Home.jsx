import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const getGroupId = (group) => {
    if (!group) return null;
    return group._id || group.id || null;
  };

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Group form state
  const [groupName, setGroupName] = useState('');
  const [groupPrice, setGroupPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isPrivate, setIsPrivate] = useState(false);
  const [memberLimit, setMemberLimit] = useState('unlimited');
  const [customMemberLimit, setCustomMemberLimit] = useState('');
  const [error, setError] = useState('');
  const [joinLoading, setJoinLoading] = useState({});

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredGroups(groups); // Reset to all groups if the search term is empty
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const filtered = groups.filter((group) =>
        group.name.toLowerCase().includes(lowerCaseSearchTerm)
      );
      setFilteredGroups(filtered);
    }
  }, [searchTerm, groups]);

  useEffect(() => {
    const checkAuthAndFetchGroups = async () => {
      const userJSON = localStorage.getItem('user');
      if (!userJSON) {
        navigate('/login');
        return;
      }

      try {
        const parsedUser = JSON.parse(userJSON);
        if (!parsedUser || !parsedUser.token) {
          throw new Error('Invalid user data');
        }

        setUser(parsedUser);
        await fetchGroups(parsedUser.token);

        // Check if the user just left a group
        const state = window.history.state || {};
        if (state.leftGroupId) {
          setGroups((prevGroups) =>
            prevGroups.map((group) =>
              group._id === state.leftGroupId
                ? { ...group, isJoinable: true }
                : group
            )
          );
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        navigate('/login');
      }
    };

    checkAuthAndFetchGroups();
  }, [navigate]);

  const fetchGroups = async (token) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/groups', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      console.log('Fetched groups:', data);

      const formattedGroups = Array.isArray(data)
        ? data
        : data.groups
        ? data.groups
        : [];

      const processedGroups = formattedGroups.map((group) => ({
        _id: group._id,
        name: group.name,
        price: group.price,
        currency: group.currency || 'USD',
        isPrivate: group.isPrivate || false,
        memberLimit: group.memberLimit || 0,
        currentMembers: group.currentMembers || (group.members?.length || 0),
        members: group.members || [],
        createdBy: group.createdBy || { _id: group.creatorId, name: 'Unknown' },
        createdAt: group.createdAt,
      }));

      setGroups(processedGroups);
      setFilteredGroups(processedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (group) => {
    if (!user?.token) {
      navigate('/login');
      return;
    }

    const groupId = getGroupId(group);

    if (!groupId) {
      setError('Invalid group ID. Cannot join group.');
      return;
    }

    setJoinLoading((prev) => ({ ...prev, [groupId]: true }));
    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to join group');
      }

      const joinResponseData = await response.json();
      console.log('Successfully joined group:', joinResponseData);

      // Update the group state to reflect the user joining
      setGroups((prevGroups) =>
        prevGroups.map((g) =>
          g._id === groupId
            ? { ...g, members: [...g.members, user], currentMembers: g.currentMembers + 1 }
            : g
        )
      );

      setFilteredGroups((prevFiltered) =>
        prevFiltered.map((g) =>
          g._id === groupId
            ? { ...g, members: [...g.members, user], currentMembers: g.currentMembers + 1 }
            : g
        )
      );

      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      setError(error.message || 'Failed to join group. Please try again.');
    } finally {
      setJoinLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const getMemberCount = (group) => {
    if (!group) return 0;
    if (typeof group.currentMembers === 'number') {
      return group.currentMembers;
    }
    if (Array.isArray(group.members)) {
      return group.members.length;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user?.token) {
      setError('You must be logged in to create a group');
      navigate('/login');
      return;
    }

    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    const priceValue = parseFloat(groupPrice) || 0;
    if (priceValue < 0) {
      setError('Price must be a positive number');
      return;
    }

    const maxMembersValue =
      memberLimit === 'unlimited'
        ? 0
        : memberLimit === 'custom'
        ? parseInt(customMemberLimit) || 0
        : 0;

    if (memberLimit === 'custom' && maxMembersValue < 2) {
      setError('Custom member limit must be at least 2');
      return;
    }

    const groupData = {
      name: groupName.trim(),
      price: priceValue,
      currency,
      memberLimit: maxMembersValue,
      isPrivate,
    };

    try {
      const response = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create group');
      }

      const newGroup = await response.json();
      setGroups((prevGroups) => [newGroup, ...prevGroups]);
      setFilteredGroups((prevFiltered) => [newGroup, ...prevFiltered]);

      // Reset form and navigate to the new group
      resetForm();
      navigate(`/groups/${newGroup._id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      setError(error.message || 'An error occurred while creating the group');
    }
  };

  const resetForm = () => {
    setGroupName('');
    setGroupPrice('');
    setCurrency('USD');
    setIsPrivate(false);
    setMemberLimit('unlimited');
    setCustomMemberLimit('');
    setShowCreateForm(false);
  };

  const isUserMember = (group) => {
    if (!user || !group) return false;

    const userId = user._id || user.id;

    if (group.createdBy && (group.createdBy._id === userId || group.createdBy.id === userId)) {
      return true;
    }

    if (!Array.isArray(group.members)) {
      if (group.userIsMember === true) {
        return true;
      }
      return false;
    }

    return group.members.some((member) => {
      if (typeof member === 'object' && member !== null) {
        return member._id === userId || member.id === userId;
      }
      return member === userId;
    });
  };

  const getCurrencySymbol = (currencyCode) => {
    if (!currencyCode) return '$';

    switch (currencyCode) {
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'USD':
      default:
        return '$';
    }
  };

  return (
    <div className="dashboard">
      <div className="welcome-section">
        <h1>Welcome, {user?.name || 'User'}!</h1>
        <p>Find and join groups or create your own.</p>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search groups by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button className="clear-search" onClick={() => setSearchTerm('')}>
            ✕
          </button>
        )}
      </div>

      <div className="dashboard-header">
        <h2>Available Groups</h2>
        <button className="create-group-button" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create New Group'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      {showCreateForm && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="groupName">Group Name *</label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              placeholder="Enter group name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupPrice">Minimum Amount to Join *</label>
            <input
              type="number"
              id="groupPrice"
              value={groupPrice}
              onChange={(e) => setGroupPrice(e.target.value)}
              placeholder="Enter minimum amount"
              min="0"
              step="0.01"
            />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div className="form-group">
            <label>Member Limit</label>
            <select value={memberLimit} onChange={(e) => setMemberLimit(e.target.value)}>
              <option value="unlimited">Unlimited</option>
              <option value="custom">Custom Limit</option>
            </select>
            {memberLimit === 'custom' && (
              <input
                type="number"
                value={customMemberLimit}
                onChange={(e) => setCustomMemberLimit(e.target.value)}
                placeholder="Enter member limit"
                min="2"
              />
            )}
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Private Group
            </label>
          </div>

          <button type="submit">Create Group</button>
        </form>
      )}
      <div className="groups-container">
        {loading ? (
          <div className="loading-message">
            <div className="spinner"></div>
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="no-groups-message">
            {searchTerm
              ? `No groups found matching "${searchTerm}". Try a different search term.`
              : 'No groups found. Create or join a group to get started!'}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const groupId = getGroupId(group);
            const memberCount = getMemberCount(group);
            const maxMembers = group.maxMembers || group.memberLimit;
            const isAtMemberLimit = maxMembers && maxMembers !== 'unlimited' && memberCount >= maxMembers;

            return (
              <div
                key={groupId || Math.random()}
                className={`group-row ${isUserMember(group) ? 'clickable' : ''}`}
                onClick={() => {
                  if (isUserMember(group) && groupId) {
                    navigate(`/groups/${groupId}`);
                  }
                }}
              >
                <div className="group-info">
                  <div className="group-content">
                    <div className="group-name-container">
                      <h2 className="group-name">
                        <div>
                          <span>{group.name || 'Unnamed Group'}</span>
                          {!isUserMember(group) && (
                            <span
                              className="view-link"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent the row click from triggering
                                if (groupId) {
                                  navigate(`/groups/${groupId}`);
                                } else {
                                  console.error('Cannot navigate - invalid group ID');
                                }
                              }}
                              style={{ color: 'goldenrod', fontSize: '1rem' }}
                            >
                              View
                            </span>
                          )}
                        </div>
                      </h2>
                    </div>
                    <div className="prize-board">
                      <div className="prize-board-title">To Win</div>
                    <div className="prize-board-amount">
                      {getCurrencySymbol(group.currency)}
                      {group.bingoCardsCount && group.bingoCardsCount > 0
                        ? group.price * group.bingoCardsCount
                        : group.price * ((group.members?.length || 1))}
                    </div>
                      <div className="prize-board-members">
                        ({group.members?.length || 0} member{group.members?.length !== 1 ? 's' : ''} playing)
                      </div>
                    </div>

                    <div className="group-details">
                     <span
            className="group-creator"
                 style={{
                            display: 'inline-block',
                                marginRight: '15px',
                                fontSize: '14px',
                                color: '#333',
                                backgroundColor: '#f9f9f9',
                                padding: '5px 10px',
                                borderRadius: '5px',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  }}
>
  <i
    className="fas fa-user-circle"
    style={{ marginRight: '5px', color: '#007bff' }}
  ></i>
  Created by: {group.createdBy?.name || 'Unknown'}
</span>

<span
  className="group-members"
  style={{
    display: 'inline-block',
    marginRight: '15px',
    fontSize: '14px',
    color: '#333',
    backgroundColor: '#f9f9f9',
    padding: '5px 10px',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  }}
>
  <i
    className="fas fa-users"
    style={{ marginRight: '5px', color: '#007bff' }}
  ></i>
  {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
  {maxMembers && maxMembers !== 'unlimited' && ` (Limit: ${maxMembers})`}
</span>

<span
  className="group-price"
  style={{
    display: 'inline-block',
    marginRight: '15px',
    fontSize: '14px',
    color: '#0056b3',
    backgroundColor: '#e6f7ff',
    padding: '5px 10px',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  }}
>
  <i
    className="fas fa-tag"
    style={{ marginRight: '5px', color: '#007bff' }}
  ></i>
  Min Amount: {getCurrencySymbol(group.currency)}
  {group.price}

</span>

{group.isPrivate && (
  <span
    className="private-badge"
    style={{
      display: 'inline-block',
      marginRight: '15px',
      fontSize: '14px',
      color: '#d9534f',
      backgroundColor: '#ffe6e6',
      padding: '5px 10px',
      borderRadius: '5px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    }}
  >
    <i
      className="fas fa-lock"
      style={{ marginRight: '5px', color: '#d9534f' }}
    ></i>
    Private
  </span>
)}

                      {isAtMemberLimit && (
                        <span className="full-badge">
                          <i className="fas fa-users-slash"></i> Full
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isUserMember(group) && groupId && !isAtMemberLimit && (
                  <button
                    className={`join-button ${joinLoading[groupId] ? 'loading' : ''}`}
                    onClick={() => handleJoinGroup(group)}
                    disabled={joinLoading[groupId]}
                  >
                    {joinLoading[groupId] ? 'Joining...' : 'Join'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Home;