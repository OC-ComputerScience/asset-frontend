<script setup>
import PersonServices from "../services/personServices";
import PersonAssetServices from "../services/personAssetServices";
import { ref, onMounted, watch, computed, defineProps } from "vue";
import router from "../router";
import moment from "moment";
import CheckinDialog from "../components/CheckinDialog.vue";

const personAssets = ref([]);
const message = ref("");
const selectedTime = ref("Current");
const showCheckin = ref(false);
const activeCheckin = ref({});
const snackbar = ref(false);
const snackbarText = ref("");

const assetSortBy = ref([{ key: "checkoutDate", order: "desc" }]);

const props = defineProps({
  personId: {
    required: true,
  },
});

// Retrieve all room assets from db and populate roomAssets[]

const retrievePersonAssets = async () => {
  try {
    const response = await PersonAssetServices.getByPersonId(props.personId);
    personAssets.value = response.data;
  } catch (error) {
    console.error("Error loading personAssets:", error);
  }
};

// Retrieve all rooms from db
const personDetails = ref({ roomNo: "Loading..." });

const retrievePersonDetails = async () => {
  try {
    const response = await PersonServices.getById(props.personId);
    personDetails.value = response.data;
  } catch (error) {
    console.error("Error loading person details:", error);
    message.value = "Failed to load person details.";
  }
};

const filterPersonAssetsByPersonId = () => {
  return personAssets.value.filter(
    (asset) =>
      String(asset.personId) === String(props.personId) &&
      asset.checkoutStatus === (selectedTime.value === "Current")
  );
};

//Person Section

const currentPersonHeaders = ref([
  { title: "Name", key: "serializedAsset.serializedAssetName" },
  { title: "View Asset Details", key: "view" },
  { title: "Check Out Date", key: "checkoutDate" },
  { title: "Checked Out By", key: "checkedOutBy" },
  { title: "Expected Check In", key: "expectedCheckinDate" },
  { title: "Check Asset In", key: "checkin" },
]);

const pastPersonHeaders = ref([
  { title: "Name", key: "serializedAsset.serializedAssetName" },
  { title: "View Asset Details", key: "view" },
  { title: "Check Out Date", key: "checkoutDate" },
  { title: "Checked Out By", key: "checkedOutBy" },
  { title: "Check In Date", key: "checkinDate" },
  { title: "Checked In By", key: "checkedInBy" },
]);

// *** Misc Section ***
const formatDate = (dateString) => {
  if (!dateString) return "Indefinite";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY - h:mm A");
};
const formatExpectedDate = (dateString) => {
  if (!dateString) return "Indefinite";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY ");
};

const showCheckinDialog = (item) => {
  activeCheckin.value = item;
  showCheckin.value = true;
};

const closeCheckinDialog = () => {
  showCheckin.value = false;
  activeCheckin.value = {};
};

const saveCheckin = async (responseText) => {
  closeCheckinDialog();
  await retrievePersonAssets();
  snackbarText.value = responseText;
  snackbar.value = true;
};

const formatCheckinDate = (dateString) => {
  if (!dateString) return "N/A";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY - h:mm A");
};
const formatCheckinName = (String) => {
  if (!String) return "N/A";
  return String;
};
function viewSerializedAsset(serializedAssetId) {
  const sourcePage = "personView";
  router.push({
    name: "serializedAssetView",
    params: { serializedAssetId: serializedAssetId, personId: props.personId },
    query: { sourcePage: sourcePage },
  });
}

const goBack = () => {
  router.replace({ name: "personManage" });
};

watch(selectedTime, (statusValue) => {
  if (selectedTime.value === "Current") {
  } else if (selectedTime.value === "Past") {
  }
});

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrievePersonDetails();
  await retrievePersonAssets();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-btn icon @click="goBack">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <v-toolbar-title>{{
              `${personDetails.fName} ${personDetails.lName}`
            }}</v-toolbar-title>
          </v-toolbar>
          <v-divider
            style="width: 80%; height: 3px; margin-bottom: 20px"
          ></v-divider>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="profile-detail">
                <div class="profile-field">Email</div>
                <div class="profile-data">{{ personDetails.email }}</div>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="profile-detail">
                <div class="profile-field">ID</div>
                <div class="profile-data">{{ personDetails.idNumber }}</div>
              </div>
            </v-col>
            <v-col v-if="personDetails.roomId != null" cols="12" sm="6">
              <div class="profile-detail">
                <div class="profile-field">Office</div>
                <div class="profile-data">
                  {{ personDetails.room.building.abbreviation }}-{{
                    personDetails.room.roomNo
                  }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-col>

        <v-col cols="12">
          <v-divider style="width: 80%; height: 3px"></v-divider>
          <v-toolbar color="background">
            <v-toolbar-title>{{
              `Asset History for ${personDetails.fName} ${personDetails.lName}`
            }}</v-toolbar-title>
          </v-toolbar>
          <v-divider style="width: 80%; height: 3px"></v-divider>
          <v-tabs v-model="selectedTime" background-color="primary" dark>
            <v-tab value="Current" color="primary">Current</v-tab>
            <v-tab value="Past" color="primary">Past</v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Active rooms Section -->
            <div v-if="selectedTime === 'Current'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Current Assets</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="currentPersonHeaders"
                    :items="filterPersonAssetsByPersonId()"
                    item-key="personAssetId"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50]"
                    v-model:sort-by="assetSortBy"
                  >
                    <template v-slot:item.view="{ item }">
                      <div
                        class="d-flex align-center justify-start"
                        style="padding-left: 10%"
                      >
                        <v-btn
                          icon
                          class="table-icons"
                          @click="viewSerializedAsset(item.serializedAssetId)"
                        >
                          <v-icon>mdi-eye</v-icon>
                        </v-btn>
                      </div>
                    </template>
                    <template v-slot:item.checkoutDate="{ item }">
                      <td>{{ formatDate(item.checkoutDate) }}</td>
                    </template>
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
                    </template>
                    <template v-slot:item.checkin="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="showCheckinDialog(item)"
                      >
                        <v-icon>mdi-arrow-down-box</v-icon>
                      </v-btn>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- Archived rooms Section -->
            <div v-if="selectedTime === 'Past'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Past Assets</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="pastPersonHeaders"
                    :items="filterPersonAssetsByPersonId()"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50]"
                    v-model:sort-by="assetSortBy"
                  >
                    <template v-slot:item.checkoutDate="{ item }">
                      <td>{{ formatDate(item.checkoutDate) }}</td>
                    </template>
                    <template v-slot:item.checkinDate="{ item }">
                      <td>
                        {{ formatDate(item.checkinDate) }}
                      </td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>
          </v-fade-transition>
        </v-col>
      </v-row>
    </v-container>
    <v-dialog v-model="showCheckin" persistent max-width="600px">
      <CheckinDialog
        assignee="People"
        :active-checkin="activeCheckin"
        :edit-mode="false"
        @cancel-checkin="closeCheckinDialog"
        @save-checkin="saveCheckin"
      />
    </v-dialog>
    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
