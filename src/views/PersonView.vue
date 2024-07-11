<script setup>
import PersonServices from "../services/personServices";
import PersonAssetServices from "../services/personAssetServices";
import { ref, onMounted, watch, computed, defineProps } from "vue";
import router from "../router";
import moment from "moment";

const personAssets = ref([]);
const message = ref("");
const selectedTime = ref("Current");

const assetSortBy = ref([{ key: "checkoutDate", order: "desc" }]);

const props = defineProps({
  personId: {
    required: true,
  },
});

// Retrieve all room assets from db and populate roomAssets[]

const retrievePersonAssets = async () => {
  try {
    const response = await PersonAssetServices.getAll();
    personAssets.value = response.data.map((personAsset) => ({
      key: personAsset.personAssetId,
      name: personAsset.serializedAsset.serializedAssetName,
      personId: personAsset.personId,
      checkoutDate: personAsset.checkoutDate,
      checkedOutBy: personAsset.checkedOutBy,
      checkinDate: personAsset.checkinDate,
      checkedInBy: personAsset.checkedInBy,
      expectedCheckinDate: personAsset.expectedCheckinDate,
      checkoutStatus: personAsset.checkoutStatus,
    }));
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
  { title: "Name", key: "name" },
  { title: "Check Out Date", key: "checkoutDate" },
  { title: "Checked Out By", key: "checkedOutBy" },
  { title: "Expected Check In", key: "expectedCheckinDate" },
]);

const pastPersonHeaders = ref([
  { title: "Name", key: "name" },
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

const formatCheckinDate = (dateString) => {
  if (!dateString) return "N/A";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY - h:mm A");
};
const formatCheckinName = (String) => {
  if (!String) return "N/A";
  return String;
};

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
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="assetSortBy"
                  >
                    <template v-slot:item.checkoutDate="{ item }">
                      <td>{{ formatDate(item.checkoutDate) }}</td>
                    </template>
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
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
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
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
  </div>
</template>
