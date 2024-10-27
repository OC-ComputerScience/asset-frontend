import apiClient from "./services.js";

const baseURL = '/customField/';

export default {
    getAll() {
        return apiClient.get(baseURL);
    },
    get(id){
        return apiClient.get(baseURL + id);
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