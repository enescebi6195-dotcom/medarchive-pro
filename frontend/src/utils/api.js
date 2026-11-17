import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);

// Patients
export const getPatients = (params) => api.get('/patients', { params }).then(r => r.data);
export const getPatient  = (id)     => api.get(`/patients/${id}`).then(r => r.data);
export const createPatient = (d)    => api.post('/patients', d).then(r => r.data);
export const updatePatient = (id,d) => api.put(`/patients/${id}`, d).then(r => r.data);
export const deletePatient = (id)   => api.delete(`/patients/${id}`).then(r => r.data);
export const saveReport    = (id,r) => api.put(`/patients/${id}/report`, { report: r }).then(r => r.data);
export const addLinks      = (id,l) => api.post(`/patients/${id}/links`, { links: l }).then(r => r.data);
export const deleteLink    = (id,index) => api.delete(`/patients/${id}/links/${index}`).then(r => r.data);
export const getPatientFiles = (id) => api.get(`/patients/${id}/files`).then(r => r.data);
export const openPatientFile = (id, path) =>
  api.get(`/patients/${id}/files/open`, { params: { path }, responseType: 'blob' }).then(r => r.data);
export const getComments   = (id)   => api.get(`/patients/${id}/comments`).then(r => r.data);
export const addComment    = (id,t) => api.post(`/patients/${id}/comments`, { text: t }).then(r => r.data);

// Studies
export const getStudies   = (pid) => api.get(`/studies/patient/${pid}`).then(r => r.data);
export const createStudy  = (d)   => api.post('/studies', d).then(r => r.data);
export const saveStudyRep = (id,r)=> api.put(`/studies/${id}/report`, { report: r }).then(r => r.data);

// Templates
export const getTemplates    = ()      => api.get('/templates').then(r => r.data);
export const createTemplate  = (d)     => api.post('/templates', d).then(r => r.data);
export const updateTemplate  = (id, d) => api.put(`/templates/${id}`, d).then(r => r.data);
export const deleteTemplate  = (id)    => api.delete(`/templates/${id}`).then(r => r.data);

// Files
export const uploadFile = (pid, file) => {
  const fd = new FormData(); fd.append('file', file);
  return api.post(`/files/upload/${pid}`, fd).then(r => r.data);
};

// Download
export const startDownload = (d)  => api.post('/download/start', d).then(r => r.data);
export const getDownloadStatus = (id) => api.get(`/download/status/${id}`).then(r => r.data);

// Users
export const getUsers        = ()      => api.get('/users').then(r => r.data);
export const createUser      = (d)     => api.post('/users', d).then(r => r.data);
export const updateUser      = (id, d) => api.put(`/users/${id}`, d).then(r => r.data);
export const deleteUser      = (id)    => api.delete(`/users/${id}`).then(r => r.data);
export const changePassword  = (d)     => api.post('/users/change-password', d).then(r => r.data);

// Stats
export const getStats = () => api.get('/stats').then(r => r.data);
