import apiClient from "./services";

const baseURL = "/report/";

export default {
  create(data) {
    return apiClient.post(baseURL, data);
  },
  getAll() {
    return apiClient.get(baseURL);
  },
  getAll(reportType) {
    return apiClient.get(baseURL, {
      params: { reportType: reportType },
    });
  },
  getById(reportId) {
    return apiClient.get(baseURL + `${reportId}`);
  },
  update(reportId, data) {
    return apiClient.put(baseURL + `${reportId}`, data);
  },
  delete(reportId) {
    return apiClient.delete(baseURL + `${reportId}`);
  },
};
