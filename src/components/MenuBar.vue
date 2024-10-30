<script setup>
import ocLogo from "/src/oc-logo-maroon.png";
import { computed, ref, onMounted } from "vue";
import Utils from "../config/utils";
import AuthServices from "../services/authServices";
import UserUserRoleServices from "../services/userUserRoleServices"
import { useRouter } from "vue-router";
import { useStore } from "vuex";

const user = ref(null);
const title = ref("Asset Tracking");
const initials = ref("");
const name = ref("");
const logoURL = ref("");
const router = useRouter();
const store = useStore(); // Use the store
const activeRole = ref(null)

const isDev = computed(() => store.getters.isDev);

const viewCheckOutIn = computed(() => store.getters.viewCheckOutIn);
const viewServices = computed(() => store.getters.viewServices);
const viewMaintenance = computed(() => store.getters.viewMaintenance);
const viewLeases = computed(() => store.getters.viewLeases);
const viewWarranties = computed(() => store.getters.viewWarranties);
const viewReports = computed(() => store.getters.viewReports);
const viewManage = computed(() => store.getters.viewManage);
const viewAssets = computed(() => store.getters.viewAssets);
const viewFacilities = computed(() => store.getters.viewFacilities);
const viewPeople = computed(() => store.getters.viewPeople);
const viewUsers = computed(() => store.getters.viewUsers);

const manageActions = computed(() => {
  let actions = [];

  if (viewAssets.value) {
    actions.push({
      title: "Assets",
      component: "assetManage",
    });
  }
  if (viewFacilities.value) {
    actions.push({
      title: "Facilities",
      component: "facilityManage",
    });
  }
  if (viewPeople.value) {
    actions.push({
      title: "People",
      component: "personManage",
    });
  }
  if (viewUsers.value) {
    actions.push({
      title: "Users",
      component: "userManage",
    });
  }
  return actions;
});

const serviceActions = computed(() => {
  let services = []
  if (viewMaintenance.value) {
    services.push({
      title: "Maintenance",
      component: "maintenance",
    });
  }
  if (viewWarranties.value) {
    services.push({
      title: "Warranties",
      component: "warranties",
    });
  }
  if (viewLeases.value) {
    services.push({
      title: "Leases",
      component: "leasing",
    });
  }
  return services;
});

const resetMenu = async() => {
  user.value = Utils.getStore("user");
  if (user.value && user.value.fName && user.value.lName) {
    initials.value = user.value.fName[0] + user.value.lName[0];
    name.value = user.value.fName + " " + user.value.lName;
  }
  if(user.value){
    user.value.roles.forEach((role) => {
      if(role.active){
        activeRole.value = role.userRole
      }
    })
  }
  
};

const logout = async() => {
  await AuthServices.logoutUser(user.value)
    .then((response) => {
      Utils.removeItem("user");
      store.commit('setLoginUser', null);
      router.push({ name: "login" }).then(() => {
      });
    })
    .catch((error) => {
      console.log("error", error);
    });
};

const updateRole = async() => {
  let role = activeRole.value.userRole
  user.value.canAdd = role.canAdd
  user.value.canEdit = role.canEdit
  user.value.canArchive = role.canArchive
  user.value.canActivate = role.canActivate
  user.value.canDelete = role.canDelete
  user.value.viewCheckOutIn = role.viewCheckOutIn
  user.value.viewServices = role.viewServices
  user.value.viewMaintenance = role.viewMaintenance
  user.value.viewWarranties = role.viewWarranties
  user.value.viewLeases = role.viewLeases
  user.value.viewReports = role.viewReports
  user.value.viewManage = role.viewManage
  user.value.viewAssets = role.viewAssets
  user.value.viewFacilities = role.viewFacilities
  user.value.viewPeople = role.viewPeople
  user.value.viewUsers = role.viewUsers
  user.value.isAdmin = role.isAdmin
  user.value.isWorker = role.isWorker
  user.value.isManager = role.isManager
  user.value.isUnassigned = role.isUnassigned
  user.value.categoryId = role.categoryId
  user.value.userRoleId = role.id

  try{
    user.value.roles.forEach(async(userRole) => {
      if(activeRole.value.id === userRole.id){
        userRole.active = true
      }
      else{ 
        userRole.active = false 
      }
      await UserUserRoleServices.update(userRole.id, {active: userRole.active})
    })
  }
  catch(err){
    console.error(err)
  }
  
  Utils.setStore("user", user.value)
  location.reload()
}

onMounted(() => {
  logoURL.value = ocLogo;
  resetMenu();
});
</script>

<template>
  <div>
    <v-app-bar app color="primary">
      <router-link
        :to="
          store.getters.isAuthenticated
          ? (
            store.getters.isAdmin
            ? { name: 'adminDashboard' }
            : (to = store.getters.isRoleAssigned
                ? { name: 'userDashboard' }
                : { name: 'unassignedDashboard' })
          )
          : {name: 'login'}
        "
      >
        <v-img class="mx-2" :src="logoURL" height="" width="60" contain></v-img>
      </router-link>
      <v-toolbar-title class="mx-5">{{ title }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <template v-if="user">
        
        <!-- Conditional rendering based on user role -->
        <template v-if="viewCheckOutIn">
          <v-btn text :to="{ name: 'assetCheckout' }">Check-Out/In</v-btn>
        </template>

        <template
          v-if="viewServices"
        >
          <v-btn>
            Services
            <v-menu activator="parent" open-on-hover>
              <v-list>
                <v-list-item
                  v-for="(item, index) in serviceActions"
                  :key="index"
                  :value="index"
                  @click="router.push({ name: item.component })"
                >
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-btn>
        </template>

        <template v-if="viewReports">
          <v-btn text :to="{ name: 'reports' }">Reports</v-btn>
        </template>

        <template
          v-if="viewManage"
        >
          <v-btn>
            Manage
            <v-menu activator="parent" open-on-hover>
              <v-list>
                <v-list-item
                  v-for="(item, index) in manageActions"
                  :key="index"
                  :value="index"
                  @click="router.push({ name: item.component })"
                >
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-btn>
        </template>

        <template v-if="isDev">
          <v-btn text :to="{ name: 'devTools' }">Dev Tools</v-btn>
        </template>
      </template>

      <template v-if="user">
        <v-menu bottom min-width="400px" rounded offset-y :close-on-content-click="false">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon x-large>
              <v-avatar color="secondary">
                <span class="accent--text font-weight-bold">{{
                  initials
                }}</span>
              </v-avatar>
            </v-btn>
          </template>
          <v-card>
            <v-card-text>
              <div class="mx-auto text-center">
                <v-avatar color="secondary" class="mt-2 mb-2">
                  <span class="accent--text font-weight-bold">{{
                    initials
                  }}</span>
                </v-avatar>
                <h3>{{ name }}</h3>
                <p class="text-caption mt-1">{{ user.email }}</p>
                <v-divider class="my-3"></v-divider>
                <v-autocomplete
                  v-model="activeRole"
                  :items="user.roles.sort((a, b) => a.userRole.name.localeCompare(b.userRole.name))"
                  item-title="userRole.name"
                  item-value="userRole"
                  return-object
                  density="compact"
                  variant="outlined"
                  label="Current Role"
                  @update:modelValue="updateRole"
                ></v-autocomplete>
                <v-divider class="my-3"></v-divider>
                <v-btn depressed rounded text @click="logout">Logout</v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-menu>
      </template>
    </v-app-bar>
  </div>
</template>

<style scoped>
.logo {
  position: absolute;
  padding: 2px;
  top: 0; /* Adjust as needed */
  left: 0; /* Adjust as needed */
}
</style>
