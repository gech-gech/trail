const API_URL = 'http://localhost:5000/api';

export const fetchGroups = async (token) => {
  const response = await fetch(`${API_URL}/groups`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// services/api.js

export const createGroup = async (token, groupData) => {
  try {
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(groupData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create group');
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};


export const joinGroup = async (groupId, token) => {
  const response = await fetch(`${API_URL}/groups/${groupId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
