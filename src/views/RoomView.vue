<script setup>
import BuildingServices from "../services/buildingServices";
import RoomServices from "../services/roomServices";
import RoomAssetServices from "../services/roomAssetServices";
import { ref, onMounted, watch, computed, defineProps } from "vue";
import router from "../router";
import moment from "moment";
import { useRoute } from "vue-router";

const route = useRoute();
const sourcePage = route.query.sourcePage;
const roomAssets = ref([]);
const message = ref("");
const selectedTime = ref("Current");

const roomsSortBy = ref([{ key: "title", order: "asc" }]);

const props = defineProps({
  roomId: {
    required: true,
  },
});

// Retrieve all room assets from db and populate roomAssets[]

const retrieveRoomAssets = async () => {
  try {
    const response = await RoomAssetServices.getAll();
    roomAssets.value = response.data.map((roomAsset) => ({
      key: roomAsset.roomAssetId,
      serializedAssetName: roomAsset.serializedAsset.serializedAssetName,
      roomId: roomAsset.roomId,
      checkoutDate: roomAsset.checkoutDate,
      checkedOutBy: roomAsset.checkedOutBy,
      checkinDate: roomAsset.checkinDate,
      checkedInBy: roomAsset.checkedInBy,
      checkoutStatus: roomAsset.checkoutStatus,
      expectedCheckinDate: roomAsset.expectedCheckinDate,
    }));
  } catch (error) {
    console.error("Error loading roomAssets:", error);
  }
};

// Retrieve all rooms from db
const roomDetails = ref({ roomNo: "..." });

const retrieveRoomDetails = async () => {
  try {
    const response = await RoomServices.getById(props.roomId);
    roomDetails.value = response.data;
  } catch (error) {
    console.error("Error loading room details:", error);
    message.value = "Failed to load room details.";
  }
};

const buildingDetails = ref({ name: "Loading..." });

const retrieveBuildingDetails = async () => {
  try {
    const response = await BuildingServices.getById(
      roomDetails.value.buildingId
    );
    buildingDetails.value = response.data;
    console.log("retrieved building details succesfully");
  } catch (error) {
    console.error("Error loading building details:", error);
    message.value = "Failed to load building details.";
  }
};

const filterRoomAssetsByRoomId = () => {
  return roomAssets.value.filter(
    (asset) =>
      String(asset.roomId) === String(props.roomId) &&
      asset.checkoutStatus === (selectedTime.value === "Current")
  );
};

//Rooms Section

const currentRoomHeaders = ref([
  { title: "Name", key: "serializedAssetName" },
  { title: "Checkout Date", key: "checkoutDate" },
  { title: "Checked Out By", key: "checkedOutBy" },
  { title: "Expected Check In", key: "expectedCheckinDate" },
]);

const pastRoomHeaders = ref([
  { title: "Name", key: "serializedAssetName" },
  { title: "Checkout Date", key: "checkoutDate" },
  { title: "Checked Out By", key: "checkedOutBy" },
  { title: "Checkin Date", key: "checkinDate" },
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
  return moment.utc(dateString).format("MMM DD, YYYY");
};

const goBack = () => {
  if (sourcePage === "buildingView") {
    router.replace({
      name: "buildingView",
      params: { buildingId: roomDetails.value.buildingId },
    });
  } else {
    router.replace({ name: "facilityManage" });
  }
};

watch(selectedTime, (statusValue) => {
  if (selectedTime.value === "Current") {
  } else if (selectedTime.value === "Past") {
  }
});

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  console.log("Received source page: " + sourcePage);
  await retrieveRoomDetails();
  await retrieveBuildingDetails();
  await retrieveRoomAssets();
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
              `Room ${roomDetails.roomNo} - ${buildingDetails.name}`
            }}</v-toolbar-title>
          </v-toolbar>
          <v-divider style="width: 80%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <!-- Introducing a spacer row for visual separation -->
      <v-row class="my-1"></v-row>

      <v-row>
        <v-col cols="12">
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
                    :headers="currentRoomHeaders"
                    :items="filterRoomAssetsByRoomId()"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="roomsSortBy"
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
                    :headers="pastRoomHeaders"
                    :items="filterRoomAssetsByRoomId()"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="roomsSortBy"
                  >
                    <template v-slot:item.checkoutDate="{ item }">
                      <td>{{ formatDate(item.checkoutDate) }}</td>
                    </template>
                    <template v-slot:item.checkinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.checkinDate) }}
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
