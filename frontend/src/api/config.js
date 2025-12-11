// Use relative path for production (Nginx proxy) or localhost for dev if not proxied
export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/login/',
  REGISTER: '/register/',
  LOGOUT: '/logout/',
  TOKEN_REFRESH: '/token/refresh/',
  TOKEN_VERIFY: '/token/verify/',

  // Profile
  PROFILE: '/profile/',
  PROFILE_SAVE: '/profile/save/',

  // TOR/OCR
  OCR: '/ocr/',
  OCR_DELETE: '/ocr/delete/',
  DEMO_OCR: '/demo-ocr/',
  COPY_TOR: '/copy-tor/',
  UPDATE_TOR_RESULTS: '/update-tor-results/',
  SYNC_COMPLETED: '/sync-completed/',
  COMPARE_RESULT_TOR: '/compareResultTOR/',

  // Grading
  APPLY_STANDARD: '/apply-standard/',
  APPLY_REVERSE: '/apply-reverse/',

  // Request/Application
  REQUEST_TOR: '/request-tor/',
  CANCEL_REQUEST: '/cancel-request/',
  REQUEST_TOR_LIST: '/requestTOR/',
  PENDING_REQUEST: '/pendingRequest/',
  ACCEPT_REQUEST: '/accept-request/',
  DENY_REQUEST: '/deny/',
  PENDING_REQUEST_UPDATE_STATUS: '/pendingRequest/update_status_for_document/',

  // Final Documents
  FINAL_DOCUMENTS: '/finalDocuments/',
  FINAL_DOCUMENTS_LIST: '/finalDocuments/listFinalTor/',
  FINALIZE_REQUEST: '/finalDocuments/finalize_request/',

  // CIT TOR
  CIT_TOR_CONTENT: '/citTorContent/',
  UPDATE_CIT_TOR_ENTRY: '/update_cit_tor_entry/',

  // Credit Evaluation
  UPDATE_CREDIT_EVALUATION: '/update_credit_evaluation/',
  UPDATE_NOTE: '/update_note/',

  // Tracking
  TRACK_USER_PROGRESS: '/track_user_progress/',
  PENDING_TRACK_PROGRESS: '/pendingRequest/track_user_progress/',
  FINAL_TRACK_PROGRESS: '/finalDocuments/track_user_progress/',
  TRACKER_ACCREDITATION: '/tracker_accreditation/',
};
