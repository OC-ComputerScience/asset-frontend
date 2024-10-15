import apiClient from "./services";
const baseURL = "/useruserroles/"

export default {
    create(data) {
        return apiClient.post(baseURL, data)
    },

    getAll() {
        return apiClient.get(baseURL)
    },

    get(id) {
        return apiClient.get(baseURL + id)
    },

    getByUser(userId) {
        return apiClient.get(`${baseURL}/user/${userId}`)
    },

    update(id, data) {
        return apiClient.put(baseURL + id, data)
    },

    delete(id) {
        return apiClient.delete(baseURL + id)
    }
}