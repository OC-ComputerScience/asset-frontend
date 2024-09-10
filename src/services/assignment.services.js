import apiClient from "./services";

const baseURL = "/assignment/";

export default {
    create(assignee, data) {
        return apiClient.post(baseURL + assignee, data);
    },
    getAll(assignee, checkedOut){
        let query = checkedOut ? "?checkedOut=true" : "";
        return apiClient.get(baseURL + assignee + query);
    },
    getRecent(assignee) {
        return apiClient.get(`${baseURL}${assignee}/recent`);
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