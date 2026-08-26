import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ---- studio key (owner password) ----
let studioKey = sessionStorage.getItem("studio_key") || "";
export const setStudioKey = (k) => {
  studioKey = k;
  sessionStorage.setItem("studio_key", k);
};
export const hasStudioKey = () => !!studioKey;
export const clearStudioKey = () => {
  studioKey = "";
  sessionStorage.removeItem("studio_key");
};
const auth = () => ({ headers: { "X-Studio-Key": studioKey } });

export const studioAuth = async (password) => (await axios.post(`${API}/studio/auth`, { password })).data;

// ---- public reads ----
export const getSite = async () => (await axios.get(`${API}/site`)).data;
export const updateSite = async (data) => (await axios.put(`${API}/site`, data, auth())).data;
export const getNotebooks = async () => (await axios.get(`${API}/notebooks`)).data;
export const getNotebookFull = async (slug) => (await axios.get(`${API}/notebooks/${slug}/full`)).data;
export const searchEntries = async (q) => (await axios.get(`${API}/search`, { params: { q } })).data;
// One piece by its own readable address, for /read/:slug
export const getReadBySlug = async (slug) => (await axios.get(`${API}/read/${slug}`)).data;

// studio read (includes drafts when key is set)
export const getNotebookFullStudio = async (slug) => (await axios.get(`${API}/notebooks/${slug}/full`, auth())).data;

// ---- protected writes ----
export const createNotebook = async (data) => (await axios.post(`${API}/notebooks`, data, auth())).data;
export const updateNotebook = async (id, data) => (await axios.put(`${API}/notebooks/${id}`, data, auth())).data;
export const deleteNotebook = async (id) => (await axios.delete(`${API}/notebooks/${id}`, auth())).data;
export const createEntry = async (data) => (await axios.post(`${API}/entries`, data, auth())).data;
export const updateEntry = async (id, data) => (await axios.put(`${API}/entries/${id}`, data, auth())).data;
export const deleteEntry = async (id) => (await axios.delete(`${API}/entries/${id}`, auth())).data;

// ---- reader reactions (public) ----
export const getReactions = async (entryId) => (await axios.get(`${API}/entries/${entryId}/reactions`)).data;
export const sendReaction = async (entryId, type) => (await axios.post(`${API}/entries/${entryId}/react`, { type })).data;

// ---- story ideas ----
export const submitIdea = async (data) => (await axios.post(`${API}/ideas`, data)).data;
export const getIdeas = async () => (await axios.get(`${API}/ideas`, auth())).data;
export const deleteIdea = async (id) => (await axios.delete(`${API}/ideas/${id}`, auth())).data;

// ---- guestbook wall ----
export const submitNote = async (data) => (await axios.post(`${API}/guestbook`, data)).data;
export const getNotes = async () => (await axios.get(`${API}/guestbook`)).data;
export const getAllNotes = async () => (await axios.get(`${API}/guestbook/all`, auth())).data;
export const approveNote = async (id) => (await axios.put(`${API}/guestbook/${id}/approve`, {}, auth())).data;
export const deleteNote = async (id) => (await axios.delete(`${API}/guestbook/${id}`, auth())).data;

// ---- now writing ----
export const getNowWriting = async () => (await axios.get(`${API}/now-writing`)).data;
export const updateNowWriting = async (data) => (await axios.put(`${API}/now-writing`, data, auth())).data;

// ---- reader mail list ----
export const subscribe = async (data) => (await axios.post(`${API}/subscribers`, data)).data;
export const getSubscribers = async () => (await axios.get(`${API}/subscribers`, auth())).data;
export const deleteSubscriber = async (id) => (await axios.delete(`${API}/subscribers/${id}`, auth())).data;
export const sendNotify = async (data) => (await axios.post(`${API}/notify`, data, auth())).data;

// ---- yearly archive ----
export const getArchive = async () => (await axios.get(`${API}/archive`)).data;

// ---- background music ----
export const MUSIC_STREAM_URL = `${API}/music/stream`;
export const getMusic = async () => (await axios.get(`${API}/music`)).data;
export const uploadMusic = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return (await axios.post(`${API}/music`, fd, { headers: { "X-Studio-Key": studioKey } })).data;
};
export const deleteMusic = async () => (await axios.delete(`${API}/music`, auth())).data;
