import apiClient from "./services";

const baseURL = "/profileData/";

export default {
  create(data) {
    return apiClient.post(baseURL, data);
  },
  getAll() {
    return apiClient.get(baseURL);
  },
  getById(profileDataId) {
    return apiClient.get(`${baseURL}${profileDataId}`);
  },
  getByProfileId(profileId) {
    return apiClient.get(`${baseURL}byProfile/${profileId}`);
  },
  update(profileDataId, data) {
    return apiClient.put(`${baseURL}${profileDataId}`, data);
  },
  delete(profileDataId) {
    return apiClient.delete(`${baseURL}${profileDataId}`);
  },
  deleteByProfileId(profileId) {
    return apiClient.delete(`${baseURL}byProfile/${profileId}`);
  },
  deleteAll() {
    return apiClient.delete(baseURL);
  },
};
