import { API_BASE_URL } from '../config';

export const fetchGroups = async (token) => {
  const response = await fetch(`${API_BASE_URL}/groups`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch groups');
  }
  return response.json();
};

export const fetchGroupDetails = async (groupId, token) => {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch group details');
  }
  return response.json();
};

export const fetchUserCards = async (groupId, token) => {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/user-cards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user cards');
  }
  return response.json();
};

export const leaveGroup = async (groupId, token) => {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/leave`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to leave group');
  }
  return response.json();
};

// Add more API functions as needed.