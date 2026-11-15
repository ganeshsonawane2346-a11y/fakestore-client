// api.js — all network access lives here.
const BASE_URL = 'https://fakestoreapi.com';
const TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
      if (!res.ok) throw new ApiError(`Server responded with ${res.status}`, res.status);
      return await res.json();
    } catch (err) {
      const isLast = attempt === retries;
      if (err.name === 'AbortError') {
        if (isLast) throw new ApiError('The request timed out. Please check your connection.');
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        throw err; // client errors won't succeed on retry
      } else if (isLast) {
        throw err instanceof ApiError ? err : new ApiError('Network error. Are you offline?');
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

export const getProducts = () => request('/products');
export const getCategories = () => request('/products/categories');
