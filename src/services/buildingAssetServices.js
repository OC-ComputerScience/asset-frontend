import apiClient from "./services";

const baseURL = "/buildingAsset/";

export default {
  create(data) {
    return apiClient.post(baseURL, data);
  },
  getAll() {
    return apiClient.get(baseURL);
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
