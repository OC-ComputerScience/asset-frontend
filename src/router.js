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
import Reports from "./views/Reports.vue";
import ReportGeneration from "./views/ReportGeneration.vue";
import Maintenance from "./views/Maintenance.vue";
import Warranties from "./views/Warranties.vue";
import Leasing from "./views/Leasing.vue";
import Checkout from "./views/Checkout.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/adminDashboard",
      name: "adminDashboard",
      component: AdminDashboard,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: "/unassignedDashboard",
      name: "unassignedDashboard",
      component: UnassignedDashboard,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: "/userDashboard",
      name: "userDashboard",
      component: UserDashboard,
      meta: {
        requiresAuth: true,
        requiresRole: true,
      },
    },
    {
      path: "/devTools",
      name: "devTools",
      component: DevTools,
      meta: {
        requiresAuth: true,
        // requiresRole: true
      },
    },
    {
      path: "/userManage",
      name: "userManage",
      component: UserManage,
      meta: {
        requiresAuth: true,
        requiresViewUsers: true,
      },
    },
    {
      path: "/assetManage",
      name: "assetManage",
      component: AssetManage,
      meta: {
        requiresAuth: true,
        requiresViewAssets: true,
      },
    },
    {
      path: "/facilityManage",
      name: "facilityManage",
      component: FacilityManage,
      meta: {
        requiresAuth: true,
        requiresViewFacilities: true,
      },
    },
    {
      path: "/personManage",
      name: "personManage",
      component: PersonManage,
      meta: {
        requiresAuth: true,
        requiresViewPeople: true,
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
      component: Checkout,
      meta: {
        requiresAuth: true,
        requiresViewCheckOutIn: true,
      },
    },
    {
      path: "/reports",
      name: "reports",
      component: Reports,
      meta: {
        requiresAuth: true,
        requiresViewReports: true,
      },
    },
    {
      path: "/reportGeneration",
      name: "reportGeneration",
      component: ReportGeneration,
      meta: {
        requiresAuth: true,
        requiresViewReports: true,
      },
    },
    {
      path: "/serializedAssetView:serializedAssetId/:personId",
      name: "serializedAssetView",
      component: SerializedAssetView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresViewAssets: true,
      },
    },
    {
      path: "/buildingView:buildingId",
      name: "buildingView",
      component: BuildingView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresViewFacilities: true,
      },
    },
    {
      path: "/RoomView:roomId",
      name: "roomView",
      component: RoomView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresViewFacilities: true,
      },
    },
    {
      path: "/PersonView:personId",
      name: "personView",
      component: PersonView,
      props: true,
      meta: {
        requiresAuth: true,
        requiresViewPeople: true,
      },
    },
    {
      path: "/Maintenance",
      name: "maintenance",
      component: Maintenance,
      meta: {
        requiresAuth: true,
        requiresViewMaintenance: true,
      },
    },
    {
      path: "/Warranties",
      name: "warranties",
      component: Warranties,
      meta: {
        requiresAuth: true,
        requiresViewWarranties: true,
      },
    },
    {
      path: "/Leasing",
      name: "leasing",
      component: Leasing,
      meta: {
        requiresAuth: true,
        requiresViewLeases: true,
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
  // redirect to unassigned dashboard if not assigned
  else if (to.meta.requiresRole && !store.getters.isRoleAssigned) {
    next("/unassignedDashboard");
  }
  // Redirect to user dashboard if doesn't have access to the specific view
  else if ((to.meta.requiresViewUsers && !store.getters.viewUsers)
    || (to.meta.requiresViewAssets && !store.getters.viewAssets)
    || (to.meta.requiresViewFacilities && !store.getters.viewFacilities)
    || (to.meta.requiresViewPeople && !store.getters.viewPeople)
    || (to.meta.requiresViewCheckOutIn && !store.getters.viewCheckOutIn)
    || (to.meta.requiresViewMaintenance && !store.getters.viewMaintenance)
    || (to.meta.requiresViewWarranties && !store.getters.viewWarranties)
    || (to.meta.requiresViewLeases && !store.getters.viewLeases)
    || (to.meta.requiresViewReports && !store.getters.viewReports)) {
    next("/userDashboard");
  }
  else {
    next();
  }
});

export default router;
