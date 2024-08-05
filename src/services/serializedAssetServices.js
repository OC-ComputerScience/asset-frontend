import apiClient from "./services";

const baseURL = "/serializedAsset/";

export default {
  create(data) {
    return apiClient.post(baseURL, data);
  },
  getAll(activeStatus, checkoutStatus) {
    let qString = "";
    if (activeStatus || checkoutStatus) qString="?";
    if (activeStatus!=null) qString+="activeStatus="+activeStatus+"&";
    if (checkoutStatus!=null) qString+="checkoutStatus="+checkoutStatus;
      return apiClient.get(baseURL+qString);
  
  },
  getAllForProfile(profileId) {
    return apiClient.get(baseURL + "profile/" + `${profileId}`);
  },

  getById(serializedAssetId) {
    return apiClient.get(baseURL + serializedAssetId);
  },

  getSerializedAssetsByCategoryId(categoryId,activeStatus, checkoutStatus) {
    let qString = "";
    if (activeStatus || checkoutStatus) qString="?";
    if (activeStatus!=null) qString+="activeStatus="+activeStatus+"&";
    if (checkoutStatus!=null) qString+="checkoutStatus="+checkoutStatus;

    return apiClient.get(baseURL + "byCategoryId/" + `${categoryId}`+qString)

  },

  update(serializedAssetId, data) {
    return apiClient.put(baseURL + serializedAssetId, data);
  },
  updateCheckoutStatus(serializedAssetId, checkoutStatus) {
    return this.update(serializedAssetId, { checkoutStatus: checkoutStatus });
  },
  delete(serializedAssetId) {
    return apiClient.delete(baseURL + serializedAssetId);
  },
  deleteAll() {
    return apiClient.delete(baseURL);
  },
};
