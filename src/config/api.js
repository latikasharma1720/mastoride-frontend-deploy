// src/config/api.js (or api/index.js)

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5001"; // local fallback

export default API_BASE_URL;
