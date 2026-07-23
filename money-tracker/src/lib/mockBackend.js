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

const handleResponse = async (res, defaultErrorMessage = 'Request failed') => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || defaultErrorMessage);
    }
    return data;
  } else {
    if (!res.ok) {
      throw new Error(`API connection failed (Status ${res.status}). Please check if the backend API server is online.`);
    }
    throw new Error('Server returned invalid data format.');
  }
};

export const mockBackend = {
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res, 'Login failed');
  },

  register: async (username, password) => {
    const res = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res, 'Registration failed');
  },

  loginWithGoogle: async (credential) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    return handleResponse(res, 'Google login failed');
  },

  getUsers: async () => {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch users');
  },

  getTransactions: async (userId = null) => {
    const url = userId ? `${API_URL}/api/transactions?userId=${userId}` : `${API_URL}/api/transactions`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch transactions');
  },

  addTransaction: async (transactionData, userId = 'legacy') => {
    const res = await fetch(`${API_URL}/api/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...transactionData, userId })
    });
    return handleResponse(res, 'Failed to add transaction');
  },

  deleteTransaction: async (id) => {
    const res = await fetch(`${API_URL}/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to delete transaction');
  },

  updateTransaction: async (id, updatedData) => {
    const res = await fetch(`${API_URL}/api/transactions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedData)
    });
    return handleResponse(res, 'Failed to update transaction');
  },

  // Collaborative Sharing Methods
  shareWorkspace: async (targetUser) => {
    const res = await fetch(`${API_URL}/api/users/share`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetUser })
    });
    return handleResponse(res, 'Failed to share workspace');
  },

  unshareWorkspace: async (targetId) => {
    const res = await fetch(`${API_URL}/api/users/unshare`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetId })
    });
    return handleResponse(res, 'Failed to revoke workspace access');
  },

  getSharingList: async () => {
    const res = await fetch(`${API_URL}/api/users/sharing`, {
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch sharing list');
  },

  getSharedWorkspaces: async () => {
    const res = await fetch(`${API_URL}/api/users/shared-with-me`, {
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch shared workspaces');
  }
};
