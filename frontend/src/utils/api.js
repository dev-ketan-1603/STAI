// Dynamic BASE_URL resolution:
// 1. If VITE_API_URL is configured (e.g. production backend URL), use it.
// 2. If running on a hosted domain without VITE_API_URL, use relative '/api'.
// 3. If running locally on localhost/127.0.0.1, use 'http://localhost:5000/api'.
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL = rawApiUrl || (isBrowser && !isLocalhost ? '/api' : 'http://localhost:5000/api');

function getHeaders() {
  const token = localStorage.getItem('stai_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${BASE_URL}${normalizedPath}`, {
    method,
    headers: getHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data };
}

const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
};

export default api;
