<script setup>
import {ref, onMounted, computed, watch} from "vue";
import AssignmentServices from "../services/assignment.services.js";
import UserRoleServices from "../services/userRoleServices";
import store from "../store/store.js";
import CheckoutTable from "../components/CheckoutTable.vue";
import CheckinTable from "../components/CheckinTable.vue";
import serializedAssetServices from "../services/serializedAssetServices.js";

const selectedTab = ref("People");
const selectedStatus = ref("Checkout");
const userRole = ref({});

const recentCheckouts = ref([]);
const recentCheckins = ref([]);
const renderKey = ref(0);
const snackbar = ref(false);
const snackbarText = ref("");

const userRoleId = computed(() => {
  return store.getters.getUserRole;
});

const getUserRole = async() => {
  let response = await UserRoleServices.get(userRoleId.value);
  userRole.value = response.data;
}

const retrieveData = async() => {
  recentCheckins.value = [];
  recentCheckouts.value = [];
  let assignee = selectedTab.value.toLocaleLowerCase();
  let categoryId = userRole.value.categoryId;
  let response;
  try {
    if(categoryId === 4){
      response = await AssignmentServices.getRecent(assignee);
    }
    else {
      response = await AssignmentServices.getRecentByCategory(assignee, categoryId);
    }
    let data = response.data;
    splitAssignments(data);
    await retrieveCheckins(assignee);
    response = await AssignmentServices.getAssignees(assignee);
    data = response.data;
    store.commit("setAssignees", data);
    forceRender();
  }
  catch(err){
    console.error(err);
  }
  
}

const retrieveAssets = async() => {
  let categoryId = userRole.value.categoryId;
  let response;
  try {
    if(categoryId === 4){
      response = await serializedAssetServices.getAll(true, false);
    }
    else {
      response = await serializedAssetServices.getSerializedAssetsByCategoryId(categoryId, true, false);
    }
    let data = response.data;
    store.commit("setAssets", data);
  }
  catch(err){
    console.error(err);
  }
}

const retrieveCheckins = async(assignee) => {
  let response = await AssignmentServices.getAll(assignee, true);
  store.commit("setCheckins", response.data);
}

const splitAssignments = (data) => {
  data.forEach(element => {
    element = {
      ...element,
      name: findAssignmentName(element)
    }
    if(element.checkoutStatus){
        recentCheckouts.value.push(element)
    }
    else{
        recentCheckins.value.push(element);
    }
  });
  recentCheckouts.value.sort((a,b) => {
    return new Date(b.checkoutDate) - new Date(a.checkoutDate);
  })
  recentCheckins.value.sort((a,b) => {
    return new Date(b.checkinDate) - new Date(a.checkinDate);
  })
}

const findAssignmentName = (assignment) => {
  let name;
  if(assignment.person) name = assignment.person.fullName;
  else if(assignment.building) name = assignment.building.name;
  else if(assignment.room) name = assignment.room.building.abbreviation + " " + assignment.room.roomNo;
  return name;
}

const forceRender = () => {
  renderKey.value += 1;
}

const onCheckout = async(responseText) => {
  snackbar.value = true;
  snackbarText.value = responseText;
  await retrieveData();
}

onMounted(async() => {
  await getUserRole();
  await retrieveData();
  await retrieveAssets();
})

</script>

<template>
<div>
    <v-container>
        <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Asset Check-Out/In </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="selectedTab" background-color="primary" dark dense @update:modelValue="retrieveData">
            <v-tab value="People" color="primary">
              <v-icon left class="mr-2">mdi-account-multiple</v-icon>
              People
            </v-tab>
            <v-tab value="Rooms" color="primary">
              <v-icon left class="mr-2">mdi-door</v-icon>
              Rooms
            </v-tab>
            <v-tab value="Buildings" color="primary">
              <v-icon left class="mr-2">mdi-domain</v-icon>
              Buildings
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs
            v-model="selectedStatus"
            background-color="primary"
            dark
            dense
          >
            <v-tab value="Checkout" color="primary">
              <v-icon left class="mr-2">mdi-debug-step-out</v-icon>
              Checkout
            </v-tab>
            <v-tab value="Check-in" color="primary">
              <v-icon left class="mr-2">mdi-debug-step-into</v-icon>
              Check-in
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <CheckoutTable
              v-if="selectedStatus === 'Checkout'"
              :assignee="selectedTab"
              :checkouts="recentCheckouts"
              :key="renderKey"
              @checkout="onCheckout"
            />
            <CheckinTable 
              v-if="selectedStatus === 'Check-in'"
              :assignee="selectedTab"
              :checkins="recentCheckins"
              :key="renderKey"
              @checkin="onCheckout"
            />
          </v-fade-transition>
        </v-col>
      </v-row>
    </v-container>
    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
</div>
</template>