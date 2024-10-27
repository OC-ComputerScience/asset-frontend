import apiClient from "./services";

const baseURL = "/roomAsset/";

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
    return apiClient.get(baseURL+"recent ");
  },
  getById(roomAssetId) {
    return apiClient.get(baseURL + `${roomAssetId}`);
  },
  getRoomAssetsBySerializedAssetId(serializedAssetId) {
    return apiClient.get(baseURL + "bySerializedAsset/" + `${serializedAssetId}`);
  },

  getRoomAssetsByCategoryId(categoryId) {
    return apiClient.get(baseURL + "byCategoryId/" + `${categoryId}`);
  },
  getRecentByCategoryId(categoryId) {
    return apiClient.get(baseURL + "byCategoryId/recent/" + `${categoryId}`);
  },

  update(roomAssetId, data) {
    return apiClient.put(baseURL + `${roomAssetId}`, data);
  },
  updateCheckoutStatus(roomAssetId, checkoutStatus) {
    return this.update(roomAssetId, { checkoutStatus: checkoutStatus });
  },
  updateCheckoutStatusAndDate(personAssetId, checkoutStatus, date, checkedInBy) {
    return this.update(personAssetId, {
      checkoutStatus: checkoutStatus,
      checkinDate: date,
      checkedInBy: checkedInBy,
    });
  },
  delete(roomAssetId) {
    return apiClient.delete(baseURL + `${roomAssetId}`);
  },
};
