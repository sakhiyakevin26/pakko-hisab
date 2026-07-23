const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.startsWith('capacitor://') || (origin.startsWith('http://localhost') && !window.location.port)) {
      return 'http://10.0.2.2:3001';
    }
  }
  return '';
};

const API_URL = getApiUrl();

const getHeaders = (extraHeaders = {}) => {
  const sessionUser = JSON.parse(localStorage.getItem('money_tracker_session') || 'null');
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (sessionUser && sessionUser.id) {
    headers['x-user-id'] = sessionUser.id;
  }
  return headers;
};

// --- Local Storage Database Fallback ---
const DEFAULT_USERS = [
  { id: 'admin-1', username: 'sakhiyarajnikbhai@gmail.com', password: 'kevin@1234', role: 'admin', sharedWith: [] },
  { id: 'admin-2', username: 'kevin', password: 'kevin1234', role: 'admin', sharedWith: [] },
  { id: 'user-1', username: 'user1', password: 'pass1', role: 'user', sharedWith: [] },
  { id: 'user-2', username: 'user2', password: 'pass2', role: 'user', sharedWith: [] },
  { id: 'user-3', username: 'user3', password: 'pass3', role: 'user', sharedWith: [] },
  { id: 'user-4', username: 'user4', password: 'pass4', role: 'user', sharedWith: [] }
];

const getLocalUsers = () => {
  const stored = localStorage.getItem('money_tracker_users');
  return stored ? JSON.parse(stored) : DEFAULT_USERS;
};

const saveLocalUsers = (users) => {
  localStorage.setItem('money_tracker_users', JSON.stringify(users));
};

const getLocalTransactions = () => {
  const stored = localStorage.getItem('money_tracker_transactions');
  return stored ? JSON.parse(stored) : [];
};

const saveLocalTransactions = (txs) => {
  localStorage.setItem('money_tracker_transactions', JSON.stringify(txs));
};

const parseGoogleToken = (credential) => {
  try {
    const parts = credential.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    }
  } catch (e) {
    console.error('Failed to parse JWT token', e);
  }
  return null;
};

import { v4 as uuidv4 } from 'uuid';

let isBackendOffline = false;
let lastCheckTime = 0;
const OFFLINE_COOLDOWN = 10000; // 10 seconds (in milliseconds)

const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
  const now = Date.now();
  if (isBackendOffline && (now - lastCheckTime < OFFLINE_COOLDOWN)) {
    throw new Error('Backend server is offline (cached connection failure)');
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    
    // Successfully contacted server, so mark backend as online
    isBackendOffline = false;
    
    return response;
  } catch (error) {
    clearTimeout(id);
    // Connection failed or timed out: mark backend as offline
    isBackendOffline = true;
    lastCheckTime = Date.now();
    throw error;
  }
};

export const mockBackend = {
  login: async (username, password) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }
    
    // Fallback logic
    const users = getLocalUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      const safeUser = { id: user.id, username: user.username, role: user.role };
      return { success: true, user: safeUser, token: 'mock-jwt-token' };
    }
    throw new Error('Invalid credentials');
  },

  register: async (username, password) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }

    // Fallback logic
    const users = getLocalUsers();
    const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    const newId = 'user-' + uuidv4();
    const newUser = { id: newId, username, password, role: 'user', sharedWith: [] };
    users.push(newUser);
    saveLocalUsers(users);

    const safeUser = { id: newUser.id, username: newUser.username, role: newUser.role };
    return { success: true, user: safeUser, token: 'mock-jwt-token' };
  },

  loginWithGoogle: async (credential) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }

    // Fallback logic
    const payload = parseGoogleToken(credential);
    if (!payload) {
      throw new Error('Invalid Google credential token');
    }

    const sub = payload.sub || uuidv4();
    const email = payload.email || `google-user-${sub.slice(0, 8)}@gmail.com`;

    const users = getLocalUsers();
    let user = users.find(u => u.username.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = {
        id: 'google-' + sub,
        username: email,
        password: 'google-oauth-managed',
        role: 'user',
        sharedWith: []
      };
      users.push(user);
      saveLocalUsers(users);
    }

    const safeUser = { id: user.id, username: user.username, role: user.role };
    return { success: true, user: safeUser, token: 'mock-jwt-token' };
  },

  getUsers: async () => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/users`, {
        headers: getHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }

    // Fallback logic
    const users = getLocalUsers();
    const sessionUser = JSON.parse(localStorage.getItem('money_tracker_session') || 'null');
    const currentUserId = sessionUser ? sessionUser.id : null;
    return users
      .filter(u => u.id !== currentUserId)
      .map(u => ({ id: u.id, username: u.username, role: u.role }));
  },

  getTransactions: async (userId = null) => {
    try {
      const res = await fetchWithTimeout(
        userId ? `${API_URL}/api/transactions?userId=${userId}` : `${API_URL}/api/transactions`,
        { headers: getHeaders() }
      );
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }

    // Fallback logic
    const sessionUser = JSON.parse(localStorage.getItem('money_tracker_session') || 'null');
    const currentUserId = sessionUser ? sessionUser.id : null;
    const targetUserId = userId || currentUserId;
    
    const txs = getLocalTransactions();
    return txs.filter(t => t.userId === targetUserId);
  },

  addTransaction: async (transactionData, userId = 'legacy') => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...transactionData, userId })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }

    // Fallback logic
    const sessionUser = JSON.parse(localStorage.getItem('money_tracker_session') || 'null');
    const currentUserId = sessionUser ? sessionUser.id : null;
    const activeUserId = userId === 'legacy' ? currentUserId : userId;

    const txs = getLocalTransactions();
    const newTx = {
      ...transactionData,
      id: activeUserId + '_' + uuidv4(),
      userId: activeUserId,
      createdAt: new Date().toISOString()
    };
    txs.push(newTx);
    saveLocalTransactions(txs);
    return newTx;
  },

  deleteTransaction: async (id) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }

    // Fallback logic
    const txs = getLocalTransactions();
    const updated = txs.filter(t => t.id !== id);
    saveLocalTransactions(updated);
    return { success: true };
  },

  updateTransaction: async (id, updatedData) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/transactions/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend server connection failed. Falling back to local storage.', e.message);
    }

    // Fallback logic
    const txs = getLocalTransactions();
    const txIndex = txs.findIndex(t => t.id === id);
    if (txIndex !== -1) {
      txs[txIndex] = { ...txs[txIndex], ...updatedData };
      saveLocalTransactions(txs);
      return txs[txIndex];
    }
    throw new Error('Transaction not found');
  },

  // Collaborative Sharing Methods
  shareWorkspace: async (targetUser) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/users/share`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetUser })
      }, 4000);
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server status ${res.status}`);
    } catch (e) {
      throw new Error(`Workspace sharing requires an active backend server connection. (Endpoint: ${API_URL || '/api'}/api/users/share). Details: ${e.message}`);
    }
  },

  unshareWorkspace: async (targetId) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/users/unshare`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetId })
      }, 4000);
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server status ${res.status}`);
    } catch (e) {
      throw new Error(`Workspace unsharing requires an active backend server connection. (Endpoint: ${API_URL || '/api'}/api/users/unshare). Details: ${e.message}`);
    }
  },

  getSharingList: async () => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/users/sharing`, {
        headers: getHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.warn('Failed to fetch sharing list:', error.message);
    }
    return [];
  },

  getSharedWorkspaces: async () => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/users/shared-with-me`, {
        headers: getHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.warn('Failed to fetch shared workspaces:', error.message);
    }
    return [];
  },

  wakeUpBackend: async () => {
    try {
      // Background request with a 50s timeout to wake up the sleeping Render backend
      await fetchWithTimeout(`${API_URL}/api/users`, { headers: getHeaders() }, 50000);
      console.log('Backend server woke up successfully.');
    } catch (error) {
      console.warn('Background wake-up failed:', error.message);
    }
  }
};
