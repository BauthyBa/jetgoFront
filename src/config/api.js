// API Configuration
const API_CONFIG = {
  // Backend URLs
  BACKEND_URLS: {
    PRODUCTION: 'https://jetgo-back.onrender.com',
    STAGING: 'https://jetgo-back.onrender.com',
    LOCAL: 'http://localhost:8000'
  },
  
  // Current environment
  getCurrentEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'LOCAL';
    } else if (hostname.includes('vercel.app')) {
      return 'PRODUCTION';
    } else {
      return 'STAGING';
    }
  },
  
  // Get current API base URL
  getApiBaseUrl() {
    const env = this.getCurrentEnvironment();
    return this.BACKEND_URLS[env];
  },
  
  // Social endpoints
  SOCIAL_ENDPOINTS: {
    POSTS: '/api/social/posts/',
    STORIES: '/api/social/stories/',
    TEST: '/api/social/test/'
  },
  
  // Get full URL for endpoint
  getEndpointUrl(endpoint) {
    return `${this.getApiBaseUrl()}${endpoint}`;
  }
};

export default API_CONFIG;
