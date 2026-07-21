const API_URL = import.meta.env.VITE_API_URL || '';

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

export const mockBackend = {
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return await res.json();
  },

  register: async (username, password) => {
    const res = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return await res.json();
  },

  loginWithGoogle: async (credential) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Google login failed');
    }
    return await res.json();
  },

  getUsers: async () => {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch users');
    }
    return await res.json();
  },

  getTransactions: async (userId = null) => {
    const url = userId ? `${API_URL}/api/transactions?userId=${userId}` : `${API_URL}/api/transactions`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch transactions');
    }
    return await res.json();
  },

  addTransaction: async (transactionData, userId = 'legacy') => {
    const res = await fetch(`${API_URL}/api/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...transactionData, userId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add transaction');
    }
    return await res.json();
  },

  deleteTransaction: async (id) => {
    const res = await fetch(`${API_URL}/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete transaction');
    }
    return await res.json();
  },

  updateTransaction: async (id, updatedData) => {
    const res = await fetch(`${API_URL}/api/transactions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update transaction');
    }
    return await res.json();
  },

  // Collaborative Sharing Methods
  shareWorkspace: async (targetUser) => {
    const res = await fetch(`${API_URL}/api/users/share`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetUser })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to share workspace');
    }
    return await res.json();
  },

  unshareWorkspace: async (targetId) => {
    const res = await fetch(`${API_URL}/api/users/unshare`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke workspace access');
    }
    return await res.json();
  },

  getSharingList: async () => {
    const res = await fetch(`${API_URL}/api/users/sharing`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch sharing list');
    }
    return await res.json();
  },

  getSharedWorkspaces: async () => {
    const res = await fetch(`${API_URL}/api/users/shared-with-me`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch shared workspaces');
    }
    return await res.json();
  }
};
