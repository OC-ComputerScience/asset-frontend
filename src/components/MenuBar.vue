<script setup>
import ocLogo from "/src/oc-logo-maroon.png";
import { computed, ref, onMounted, nextTick } from "vue";
import Utils from "../config/utils";
import AuthServices from "../services/authServices";
import { useRouter } from "vue-router";
import { useStore } from "vuex";

const user = ref(null);
const title = ref("Asset Tracking");
const initials = ref("");
const name = ref("");
const logoURL = ref("");
const router = useRouter();
const store = useStore(); // Use the store

const isAdmin = computed(() => store.getters.isAdmin);
const isManager = computed(() => store.getters.isManager);
const isRoleAssigned = computed(() => store.getters.isRoleAssigned);
// Compute isDev from store
const isDev = computed(() => store.getters.isDev);
const canAdd = computed(() => {
  return store.getters.canAdd;
});

const canEdit = computed(() => store.getters.canEdit);
const canDelete = computed(() => store.getters.canDelete);
const canArchive = computed(() => store.getters.canArchive);
const canActivate = computed(() => store.getters.canActivate);
const canManageMaintenance = computed(() => store.getters.canManageMaintenance);
const canManageLeases = computed(() => store.getters.canManageLeases);
const canManageWarranties = computed(() => store.getters.canManageWarranties);

const manageActions = computed(() => {
  let actions = [
    {
      title: "Assets",
      component: "assetManage",
    },
    {
      title: "Facilities",
      component: "facilityManage",
    },
    {
      title: "People",
      component: "personManage",
    },
  ];

  if (isAdmin.value) {
    actions.push({
      title: "Users",
      component: "userManage",
    });
  }

  return actions;
});

const serviceActions = computed(() => {
  let services = []
  if (canManageMaintenance.value) {
    services.push({
      title: "Maintenance",
      component: "maintenance",
    });
  }
  if (canManageWarranties.value) {
    services.push({
      title: "Warranties",
      component: "warranties",
    });
  }
  if (canManageLeases.value) {
    services.push({
      title: "Leasing",
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
};

const logout = async() => {
  await AuthServices.logoutUser(user.value)
    .then((response) => {
      Utils.removeItem("user");
      store.commit('setLoginUser', null);
      router.push({ name: "login" }).then(() => {
        // if (process.env.NODE_ENV === "development") {
        //   router.go();
        // }
      });
    })
    .catch((error) => {
      console.log("error", error);
    });
};

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
        <template v-if="isRoleAssigned">
          <v-btn text :to="{ name: 'assetCheckout' }">Check-Out/In</v-btn>
        </template>

        <template
          v-if="isRoleAssigned"
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

        <template v-if="isAdmin">
          <v-btn text :to="{ name: 'reports' }">Reports</v-btn>
        </template>

        <template
          v-if="canAdd || canDelete || canEdit || canArchive || canActivate"
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
        <v-menu bottom min-width="200px" rounded offset-y>
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
