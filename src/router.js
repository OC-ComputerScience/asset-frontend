import { createRouter, createWebHistory } from "vue-router";
import store from "./store/store";

import Login from "./views/Login.vue";
import AdminDashboard from "./views/AdminDashboard.vue";
import UnassignedDashboard from "./views/UnassignedDashboard.vue";
import UserDashboard from "./views/UserDashboard.vue";
import DevTools from "./views/DevTools.vue";
import UserManage from "./views/UserManage.vue";
import AssetManage from "./views/AssetManage.vue";
import FacilityManage from "./views/FacilityManage.vue";
import PersonManage from "./views/PersonManage.vue";
import ProfileView from "./views/ProfileView.vue";
import SerializedAssetView from "./views/SerializedAssetView.vue";
import BuildingView from "./views/BuildingView.vue";
import RoomView from "./views/RoomView.vue";
import PersonView from "./views/PersonView.vue";
import AssetCheckout from "./views/AssetCheckout.vue";
import Reports from "./views/Reports.vue";
import ReportGeneration from "./views/ReportGeneration.vue";
import Maintenance from "./views/Maintenance.vue";
import Warranties from "./views/Warranties.vue";
import Leasing from "./views/Leasing.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/login",
      name: "login",
      component: Login,
      // meta: {
      //   breadCrumb: [{ text: 'Login' }]
      // }
    },
    {
      path: "/adminDashboard",
      name: "adminDashboard",
      component: AdminDashboard,
      meta: {
        // breadCrumb: [{ text: 'Admin Dashboard' }]
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: "/unassignedDashboard",
      name: "unassignedDashboard",
      component: UnassignedDashboard,
      meta: {
        // breadCrumb: [{ text: 'Unassigned Dashboard' }]
        requiresAuth: true,
      },
    },
    {
      path: "/userDashboard",
      name: "userDashboard",
      component: UserDashboard,
      meta: {
        // breadCrumb: [
        //   { text: 'Login', to: {name: 'login'}},
        //   { text: 'User Dashboard' }
        // ]
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/devTools",
      name: "devTools",
      component: DevTools,
      meta: {
        // breadCrumb: [
        //   { text: 'Admin Dashboard', to: {name: 'adminDashboard'}},
        //   { text: 'Dev Tools' }
        // ]
        requiresAuth: true,
        // requiresRole: true
      },
    },
    {
      path: "/userManage",
      name: "userManage",
      component: UserManage,
      meta: {
        // breadCrumb: [
        //   { text: 'Admin Dashboard'},
        //   { text: 'User Manage' }
        // ]
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: "/assetManage",
      name: "assetManage",
      component: AssetManage,
      meta: {
        // breadCrumb: [
        //   { text: 'Admin Dashboard'},
        //   { text: 'Asset Manage' }
        // ]
        requiresAuth: true,
        requiresManagerOrAdmin: true,
      },
    },
    {
      path: "/facilityManage",
      name: "facilityManage",
      component: FacilityManage,
      meta: {
        // breadCrumb: [
        //   { text: 'Admin Dashboard'},
        //   { text: 'Building Manage' }
        // ]
        requiresAuth: true,
        requiresManagerOrAdmin: true,
      },
    },
    {
      path: "/personManage",
      name: "personManage",
      component: PersonManage,
      meta: {
        requiresAuth: true,
        requiresManagerOrAdmin: true,
      },
    },
    {
      path: "/profileView:profileId",
      name: "profileView",
      component: ProfileView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/assetCheckout",
      name: "assetCheckout",
      component: AssetCheckout,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/reports",
      name: "reports",
      component: Reports,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: "/reportGeneration",
      name: "reportGeneration",
      component: ReportGeneration,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: "/serializedAssetView:serializedAssetId",
      name: "serializedAssetView",
      component: SerializedAssetView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/buildingView:buildingId",
      name: "buildingView",
      component: BuildingView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/RoomView:roomId",
      name: "roomView",
      component: RoomView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/PersonView:personId",
      name: "personView",
      component: PersonView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/Maintenance",
      name: "maintenance",
      component: Maintenance,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/Warranties",
      name: "warranties",
      component: Warranties,
      meta: {
        requiresAuth: true,
        requiresManagerOrAdmin: true,
      },
    },
    {
      path: "/Leasing",
      name: "leasing",
      component: Leasing,
      meta: {
        requiresAuth: true,
        requiresManagerOrAdmin: true,
      },
    },
  ],
});

// Navigation guards
router.beforeEach((to, from, next) => {
  // Redirect to login if not authenticated
  if (to.meta.requiresAuth && !store.getters.isAuthenticated) {
    next("/login");
  }
  // Redirect to user dashboard if not admin
  else if (to.meta.requiresAdmin && !store.getters.isAdmin) {
    next("/userDashboard");
  }
  // Redirect to user dashboard if not manager
  else if (to.meta.requiresManagerOrAdmin && !store.getters.isManager && !store.getters.isAdmin) {
    next("/userDashboard");
  }
  // redirect to unassigned dashboard if not assigned
  else if (to.meta.requiresRole && !store.getters.isRoleAssigned) {
    next("/unassignedDashboard");
  } else {
    next();
  }
});

export default router;
