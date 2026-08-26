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
export const getNotebooks = async () => (await axios.get(`${API}/notebooks`)).data;
export const getNotebookFull = async (slug) => (await axios.get(`${API}/notebooks/${slug}/full`)).data;

// ---- protected writes ----
export const createNotebook = async (data) => (await axios.post(`${API}/notebooks`, data, auth())).data;
export const updateNotebook = async (id, data) => (await axios.put(`${API}/notebooks/${id}`, data, auth())).data;
export const deleteNotebook = async (id) => (await axios.delete(`${API}/notebooks/${id}`, auth())).data;
export const createEntry = async (data) => (await axios.post(`${API}/entries`, data, auth())).data;
export const updateEntry = async (id, data) => (await axios.put(`${API}/entries/${id}`, data, auth())).data;
export const deleteEntry = async (id) => (await axios.delete(`${API}/entries/${id}`, auth())).data;
