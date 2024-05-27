import apiClient from "./services.js";

const baseURL = '/customFieldType/';

export default {
    getAll() {
        return apiClient.get(baseURL);
    },
    get(id){
        return apiClient.get(baseURL + id);
    },
    getAllForType(typeId){
        return apiClient.get(baseURL + `type/${typeId}`);
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