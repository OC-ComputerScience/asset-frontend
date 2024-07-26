import apiClient from "./services";

const baseURL = "/personAsset/";

export default {
  create(data) {
    return apiClient.post(baseURL, data);
  },
  getAll() {
    return apiClient.get(baseURL);
  },
  getAllRecent() {
    return apiClient.get(baseURL+'recent');
  },
  getById(personAssetId) {
    return apiClient.get(baseURL + `${personAssetId}`);
  },
  getPersonAssetsBySerializedAssetId(serializedAssetId) {
    return apiClient.get(baseURL + "bySerializedAsset/" + `${serializedAssetId}`);
  },
  getPersonAssetsByCategoryId(categoryId) {
    return apiClient.get(baseURL + "byCategoryId/" + `${categoryId}`);
  },
  getRecentByCategoryId(categoryId) {
    return apiClient.get(baseURL + "byCategoryId/recent/" + `${categoryId}`);
  },
  update(personAssetId, data) {
    return apiClient.put(baseURL + `${personAssetId}`, data);
  },
  updateCheckoutStatus(personAssetId, checkoutStatus) {
    return this.update(personAssetId, { checkoutStatus: checkoutStatus });
  },
  updateCheckoutStatusAndDate(personAssetId, checkoutStatus, date, checkedInBy) {
    return this.update(personAssetId, {
      checkoutStatus: checkoutStatus,
      checkinDate: date,
      checkedInBy: checkedInBy,
    });
  },
  delete(personAssetId) {
    return apiClient.delete(baseURL + `${personAssetId}`);
  },
  deleteAll() {
    return apiClient.delete(baseURL);
  },
};
