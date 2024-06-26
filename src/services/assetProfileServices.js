import apiClient from "./services";

const baseURL = "/assetProfile/";

export default {
  create(data) {
    return apiClient.post(baseURL, data);
  },
  getAll() {
    return apiClient.get(baseURL);
  },
  getById(profileId) {
    return apiClient.get(baseURL + `${profileId}`);
  },
  getByType(typeId){
    return apiClient.get(baseURL + `type/${typeId}`);
  },
  getProfilesByCategoryId(categoryId) {
    return apiClient.get(baseURL + "byCategoryId/" + `${categoryId}`);
  },
  update(profileId, data) {
    return apiClient.put(baseURL + `${profileId}`, data);
  },
  delete(profileId) {
    return apiClient.delete(baseURL + `${profileId}`);
  },
  deleteAll() {
    return apiClient.delete(baseURL);
  },
};
