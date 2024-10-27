import { createStore } from "vuex";
import Utils from "../config/utils";

const user = Utils.getStore("user");
const assignees = Utils.getStore("assignees");
const assets = Utils.getStore("assets");
const checkins = Utils.getStore("checkins");

const store = createStore({
  state: {
    loginUser: user,
    assignees: assignees,
    assets: assets,
    checkins: checkins,
  },
  mutations: {
    setLoginUser(state, user) {
      state.loginUser = user;
      Utils.setStore("user", user);
    },
    setAssignees(state, assignees) {
      state.assignees = assignees;
      Utils.setStore("assignees", assignees);
    },
    setAssets(state, assets) {
      state.assets = assets;
      Utils.setStore("assets", assets);
    },
    setCheckins(state, checkins) {
      state.checkins = checkins;
      Utils.setStore("checkins", checkins);
    }
  },
  actions: {
    login({ commit }, user) {
      commit("setLoginUser", user);
    },
  },
  getters: {
    getAssignees(state) {
      return state.assignees;
    },
    getAssets(state) {
      return state.assets;
    },
    getCheckins(state) {
      return state.checkins;
    },
    getLoginUserInfo(state) {
      return state.loginUser;
    },
    isAuthenticated(state) {
      return state.loginUser !== null;
    },
    getUserRole(state) {   
      return state.loginUser.userRoleId;
    },
    isAdmin(state) {
      return state.loginUser && state.loginUser.isAdmin;
    },
    isManager(state) {
      return state.loginUser && state.loginUser.isManager;
    },
    isWorker(state) {
      return state.loginUser && state.loginUser.isWorker;
    },
    isRoleAssigned(state) {
      return state.loginUser && state.loginUser.isUnassigned == false;
    },
    isDev(state) {
      return state.loginUser && state.loginUser.devPermission === true;
    },
    canAdd(state) {
      return state.loginUser && state.loginUser.canAdd === true;
    },
    canEdit(state) {
      return state.loginUser && state.loginUser.canEdit === true;
    },
    canDelete(state) {
      return state.loginUser && state.loginUser.canDelete === true;
    },
    canArchive(state) {
      return state.loginUser && state.loginUser.canArchive === true;
    },
    canActivate(state) {
      return state.loginUser && state.loginUser.canActivate === true;
    },
    viewCheckOutIn(state) {
      return state.loginUser && state.loginUser.viewCheckOutIn === true;
    },
    viewServices(state) {
      return state.loginUser && state.loginUser.viewServices === true;
    },
    viewMaintenance(state) {
      return state.loginUser && state.loginUser.viewMaintenance === true;
    },
    viewWarranties(state) {
      return state.loginUser && state.loginUser.viewWarranties === true;
    },
    viewLeases(state) {
      return state.loginUser && state.loginUser.viewLeases === true;
    },
    viewReports(state) {
      return state.loginUser && state.loginUser.viewReports === true;
    },
    viewManage(state) {
      return state.loginUser && state.loginUser.viewManage === true;
    },
    viewAssets(state) {
      return state.loginUser && state.loginUser.viewAssets === true;
    },
    viewFacilities(state) {
      return state.loginUser && state.loginUser.viewFacilities === true;
    },
    viewPeople(state) {
      return state.loginUser && state.loginUser.viewPeople === true;
    },
    viewUsers(state) {
      return state.loginUser && state.loginUser.viewUsers === true;
    }
  },
});

export default store;