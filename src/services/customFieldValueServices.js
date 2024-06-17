import apiClient from "./services.js";

const baseURL = '/customFieldValue/';

export default {
    getAll() {
        return apiClient.get(baseURL);
    },
    get(id){
        return apiClient.get(baseURL + id);
    },
    getAllForField(fieldId){
        return apiClient.get(`${baseURL}field/${fieldId}`);
    },
    getAllForProfile(profileId){
        return apiClient.get(`${baseURL}profile/${profileId}`);
    },
    create(data){
        return apiClient.post(baseURL, data);
    },
    update(id, data){
        return apiClient.put(baseURL + id, data);
    },
    delete(id){
        return apiClient.delete(baseURL + id);
    },
    deleteAll(){
        return apiClient.delete(baseURL);
    }
};