import apiClient from "./services";

const baseURL = "/buildingAsset/";

export default {
  create(data) {
    return apiClient.post(baseURL, data);
  },
  getAll(checkedOut) {
    if (checkedOut === true) {
      return apiClient.get(baseURL + "?checkedOut=true");
    }
    return apiClient.get(baseURL);
  },
  getAllRecent() {
    return apiClient.get(baseURL+'recent');
  },
  getById(buildingAssetId) {
    return apiClient.get(baseURL + `${buildingAssetId}`);
  },
  getBuildingAssetsBySerializedAssetId(serializedAssetId) {
    return apiClient.get(baseURL + "bySerializedAsset/" + `${serializedAssetId}`);
  },
  getBuildingAssetsByCategoryId(categoryId) {
    return apiClient.get(baseURL + "byCategoryId/" + `${categoryId}`);
  },
  getRecentByCategoryId(categoryId) {
    return apiClient.get(baseURL + "byCategoryId/recent/" + `${categoryId}`);
  },

  update(buildingAssetId, data) {
    return apiClient.put(baseURL + `${buildingAssetId}`, data);
  },
  updateCheckoutStatus(buildingAssetId, checkoutStatus) {
    return this.update(buildingAssetId, { checkoutStatus: checkoutStatus });
  },
  updateCheckoutStatusAndDate(personAssetId, checkoutStatus, date, checkedInBy) {
    return this.update(personAssetId, {
      checkoutStatus: checkoutStatus,
      checkinDate: date,
      checkedInBy: checkedInBy,
    });
  },
  delete(buildingAssetId) {
    return apiClient.delete(baseURL + `${buildingAssetId}`);
  },
  deleteAll() {
    return apiClient.delete(baseURL);
  },
};
