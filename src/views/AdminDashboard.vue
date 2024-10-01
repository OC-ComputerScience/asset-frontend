<script setup>
import PersonAssetServices from "../services/personAssetServices";
import BuildingAssetServices from "../services/buildingAssetServices";
import RoomAssetServices from "../services/roomAssetServices";
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { format, parseISO, isBefore } from "date-fns";
import moment from "moment-timezone";

const router = useRouter();
const message = ref("");
const personAssets = ref([]);
const buildingAssets = ref([]);
const roomAssets = ref([]);
const snackbar = ref(false);
const snackbarText = ref("");

// Retrieve PersonAssets from Database
const retrievePersonAssets = async () => {
  try {
    const response = await PersonAssetServices.getAllRecent();
    personAssets.value = response.data.map((personAsset) => {
      return {
        ...personAsset,
        fullName: personAsset.person
          ? personAsset.person.fullName
          : "Unknown/Archived",
        title: personAsset.serializedAsset
          ? personAsset.serializedAsset.serializedAssetName
          : "Unknown/Archived Asset",
      };
    });
  } catch (error) {
    console.error("Error loading person assets:", error);
    message.value = "Failed to load person assets.";
  }
};

// Retrieve BuildingAssets from Database
const retrieveBuildingAssets = async () => {
  try {
    const response = await BuildingAssetServices.getAllRecent();
    buildingAssets.value = response.data.map((buildingAsset) => {
      return {
        ...buildingAsset,
        name: buildingAsset.building
          ? buildingAsset.building.name
          : "Unknown/Archived",
        title: buildingAsset.serializedAsset
          ? buildingAsset.serializedAsset.serializedAssetName
          : "Unknown/Archived Asset",
      };
    });
  } catch (error) {
    console.error("Error loading building assets:", error);
    message.value = "Failed to load building assets.";
  }
};

// Retrieve RoomAssets from Database
const retrieveRoomAssets = async () => {
  try {
    const response = await RoomAssetServices.getAllRecent();
    roomAssets.value = response.data.map((roomAsset) => {
      return {
        ...roomAsset,
        name: roomAsset.room ? roomAsset.room.roomName : "Unknown/Archived",
        title: roomAsset.serializedAsset
          ? roomAsset.serializedAsset.serializedAssetName
          : "Unknown/Archived Asset",
      };
    });
  } catch (error) {
    console.error("Error loading room assets:", error);
    message.value = "Failed to load room assets.";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "Indefinite";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY - h:mm A");
};

const activityHeaders = ref([
  { title: "Owner/Facility", key: "owner" },
  { title: "Asset", key: "assetTitle" },
  { title: "Activity Type", key: "activityType" },
  { title: "Checked Out/In By", key: "activityBy" },
  { title: "Most Recent Date", key: "mostRecentDate", sortable: false },
]);

const combinedAssets = computed(() => {
  let allActivities = [];

  // Function to add activities
  const addActivity = (asset, type, date, activityBy) => {
    allActivities.push({
      owner: asset.fullName || asset.name, // Use fullName for person, name for building/room
      assetTitle: asset.title,
      activityType: type,
      mostRecentDate: date,
      assignmentType: asset.assignmentType, // Added to differentiate asset types
      activityBy,
    });
  };

  // Process person assets

  personAssets.value.forEach((asset) => {

    if (
      asset.checkoutDate &&
      new Date(asset.checkoutDate) >= moment().subtract(28, "days").toDate()
    ) {
      addActivity(asset, "Checkout", asset.checkoutDate, asset.checkedOutBy);
    }
    if (
      asset.checkinDate &&
      new Date(asset.checkinDate) >= moment().subtract(28, "days").toDate()
    ) {
      addActivity(asset, "Check-in", asset.checkinDate, asset.checkedInBy);
    }
  });

  // Process building assets
  buildingAssets.value.forEach((asset) => {
    if (
      asset.checkoutDate &&
      new Date(asset.checkoutDate) >= moment().subtract(28, "days").toDate()
    ) {
      addActivity(asset, "Checkout", asset.checkoutDate, asset.checkedOutBy);
    }
    if (
      asset.checkinDate &&
      new Date(asset.checkinDate) >= moment().subtract(28, "days").toDate()
    ) {
      addActivity(asset, "Check-in", asset.checkinDate, asset.checkedInBy);
    }
  });

  // Process room assets
  roomAssets.value.forEach((asset) => {
    if (
      asset.checkoutDate &&
      new Date(asset.checkoutDate) >= moment().subtract(28, "days").toDate()
    ) {
      addActivity(asset, "Checkout", asset.checkoutDate, asset.checkedOutBy);
    }
    if (
      asset.checkinDate &&
      new Date(asset.checkinDate) >= moment().subtract(28, "days").toDate()
    ) {
      addActivity(asset, "Check-in", asset.checkinDate, asset.checkedInBy);
    }
  });

  // Sort and format dates
  return allActivities
    .map((activity) => ({
      ...activity,
      mostRecentDateObj: parseISO(activity.mostRecentDate),
    }))
    .sort((a, b) => b.mostRecentDateObj - a.mostRecentDateObj)
    .map(({ mostRecentDateObj, ...activity }) => ({
      ...activity,
      mostRecentDate: formatDate(mostRecentDateObj),
    }))
    .slice(0, 50); // Limit to the 50 most recent activities
});

function goToCheckoutPage() {
  router.push({ name: "assetCheckout" });
}

onMounted(async () => {
  await retrievePersonAssets();
  await retrieveBuildingAssets();
  await retrieveRoomAssets();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Admin Dashboard </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <span>Recent Activity</span>
              <v-btn color="saveblue" class="ma-2" @click="goToCheckoutPage">
                Check-Out/In
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-data-table
                :headers="activityHeaders"
                :items="combinedAssets"
                :items-per-page="5"
                :items-per-page-options="[5, 10, 20, 50, -1]"
              >
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
