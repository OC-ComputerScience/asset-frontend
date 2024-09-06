import apiClient from "./services";

const baseURL = "/assignment/";

export default {
    create(assignee, data) {
        return apiClient.post(baseURL + assignee, data);
    },
    getRecent(assignee) {
        return apiClient.get(baseURL + assignee);
    },
    getRecentByCategory(assignee, categoryId){
        return apiClient.get(`${baseURL}${assignee}/category/${categoryId}`);
    },
    getById(assignee, id){
        return apiClient.get(baseURL + assignee + id);
    },
    update(assignee, id, data){
        return apiClient.put(`${baseURL}${assignee}/${id}`, data);
    },
    getAssignees(assignee){
        return apiClient.get(`${baseURL}assignee/${assignee}`);
    }
}