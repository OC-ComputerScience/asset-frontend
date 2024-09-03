<script setup>
import {ref, onMounted, computed} from "vue";
import AssignmentServices from "../services/assignment.services.js";
import UserRoleServices from "../services/userRoleServices";
import store from "../store/store.js";

const selectedTab = ref("People");
const selectedStatus = ref("Checkout");
const userRole = ref({});

const recentCheckouts = ref([]);
const recentCheckins = ref([]);
const assignees = ref([]);

const userRoleId = computed(() => {
  return store.getters.getUserRole;
});

const getUserRole = async() => {
    let response = await UserRoleServices.get(userRoleId.value);
    userRole.value = response.data;
}

const retrieveData = async() => {
    let assignee = selectedTab.value.toLocaleLowerCase();
    let categoryId = userRole.value.categoryId;
    let response;
    if(categoryId === 4){
        response = await AssignmentServices.getRecent(assignee);
    }
    else {
        response = await AssignmentServices.getRecentByCategory(assignee, categoryId);
    }
    let data = response.data;
    data.forEach(element => {
        if(element.checkoutStatus){
            recentCheckouts.value.push(element);
        }
        else{
            recentCheckins.value.push(element);
        }
    });
}

onMounted(async() => {
    await getUserRole();
    await retrieveData();
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
          <v-tabs v-model="selectedTab" background-color="primary" dark dense>
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
    </v-container>
</div>
</template>