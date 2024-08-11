<script setup>
import BuildingServices from "../services/buildingServices";
import RoomServices from "../services/roomServices";
import BuildingAssetServices from "../services/buildingAssetServices";
import { ref, onMounted, watch, computed } from "vue";
import router from "../router";
import { useStore } from "vuex";
import moment from "moment";

const message = ref("");
const selectedTab = ref("Rooms");
const selectedStatus = ref("Active");
const selectedTime = ref("Current");
const buildings = ref([]);
const rooms = ref([]);
const buildingAssets = ref([]);
const showAddRoomDialog = ref(false);
const editingRoom = ref(false);
const originalRoom = ref({});
const selectedBuildingId = ref("");
const validBuilding = ref(false);
const validRoom = ref(false);
const showArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const itemToArchive = ref(null);
const itemToActivate = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const roomsSortBy = ref([{ key: "title", order: "asc" }]);
const store = useStore();
const canAdd = computed(() => {
  return store.getters.canAdd;
});
const rules = {
  required: (value) => !!value || "Required.",
  maxNameLength: (value) => value.length <= 80,
  roomNumber: (value) =>
    /^[a-zA-Z0-9]{2,4}$/.test(value) ||
    "Room number must be between 2 and 4 characters long.",
  numberOfRooms: (value) => {
    const intValue = parseInt(value);
    return (
      (Number.isInteger(intValue) && intValue >= 0 && intValue <= 400) ||
      "Number of rooms cannot be greater than 400"
    );
  },
  buildingAbbreviation: (value) => {
    const pattern = /^[a-zA-Z]{2,3}$/;
    return (
      pattern.test(value) || "Building Abbreviation must be 2 or 3 characters"
    );
  },
};

const props = defineProps({
  buildingId: {
    required: true,
  },
});
const newRoom = ref({
  title: "",
  buildingId: "",
});

// *** BuildingAssets section ***

const retrieveBuildingAssets = async () => {
  try {
    const response = await BuildingAssetServices.getAll();
    buildingAssets.value = response.data.map((buildingAsset) => ({
      title: buildingAsset.serializedAssetId,
      name: buildingAsset.serializedAsset.serializedAssetName,
      key: buildingAsset.buildingAssetId,
      buildingId: buildingAsset.buildingId,
      checkoutDate: buildingAsset.checkoutDate,
      expectedCheckinDate: buildingAsset.expectedCheckinDate,
      checkinDate: buildingAsset.checkinDate,
      checkoutStatus: buildingAsset.checkoutStatus,
      checkedOutBy: buildingAsset.checkedOutBy,
      checkedInBy: buildingAsset.checkedInBy,
    }));
  } catch (error) {
    console.error("Error loading buildingsAssets:", error);
  }
};

const filterBuildingAssetsByBuildingId = () => {
  return buildingAssets.value.filter(
    (asset) =>
      String(asset.buildingId) === String(props.buildingId) &&
      asset.checkoutStatus === (selectedTime.value === "Current")
  );
};

const retrieveBuildings = async () => {
  try {
    const response = await BuildingServices.getAll();
    buildings.value = response.data.map((building) => ({
      title: building.name,
      key: building.buildingId,
      function: building.function,
      abbreviation: building.abbreviation,
      yearBuilt: building.yearBuilt,
      squareFeet: building.squareFeet,
      numStories: building.numStories,
      hasElevator: building.hasElevator,
      hasFireMonitor: building.hasFireMonitor,
      hasSmokeAlarm: building.hasSmokeAlarm,
      fireSmokeNotes: building.fireSmokeNotes,
      constructionType: building.constructionType,
      roofType: building.roofType,
      buildingValue: building.buildingValue,
      buildingBPP: building.buildingBPP,
      renovationNotes: building.renovationNotes,
      activeStatus: building.activeStatus,
    }));
  } catch (error) {
    console.error("Error loading buildings:", error);
  }
};

const buildingDetails = ref({ buildingName: "Loading..." });

const retrieveBuildingDetails = async () => {
  try {
    const response = await BuildingServices.getById(props.buildingId);
    buildingDetails.value = response.data;
  } catch (error) {
    message.value = "Failed to load building details.";
  }
};

const currentBuildingAssetHeaders = ref([
  { title: "Name", key: "name" },
  { title: "Check Out Date", key: "checkoutDate" },
  { title: "Checked out by", key: "checkedOutBy" },
  { title: "Expected Checkin Date", key: "expectedCheckinDate" },
]);

const pastBuildingAssetHeaders = ref([
  { title: "Name", key: "name" },
  { title: "Check Out Date", key: "checkoutDate" },
  { title: "Checked out by", key: "checkedOutBy" },
  { title: "Checkin Date", key: "checkinDate" },
  { title: "Checked in by", key: "checkedInBy" },
]);

// *** Rooms Section ***

// Retrieve Rooms from Database

function viewRoom(roomId) {
  const sourcePage = "buildingView";
  router.push({
    name: "roomView",
    params: { roomId: roomId },
    query: { sourcePage: sourcePage },
  });
}

const retrieveRooms = async () => {
  try {
    // Assuming you've already fetched buildings at this point
    const roomsResponse = await RoomServices.getAll();
    const enrichedRooms = roomsResponse.data.map((room) => {
      // Find the building for each type
      const building = buildings.value.find((c) => c.key === room.buildingId);
      return {
        ...room,
        buildingName: building ? building.title : "Unknown Building", // Enriching room with building name
        key: room.roomId, // Keeping your original key assignment
        title: room.roomNo, // Assuming you're mapping roomNo to roomNo
        buildingId: room.buildingId,
      };
    });
    rooms.value = enrichedRooms;
  } catch (error) {
    message.value = "Failed to load rooms.";
  }
};

const filterRoomsByBuildingId = () => {
  return rooms.value.filter(
    (room) =>
      String(room.buildingId) === String(props.buildingId) &&
      room.activeStatus === (selectedStatus.value === "Active")
  );
};

const editRoom = (room) => {
  selectedBuildingId.value = room.buildingId; // Assuming you have this ID correctly set
  newRoom.value = {
    title: room.title,
    buildingId: room.buildingId,
    roomId: room.roomId,
  };
  editingRoom.value = true;
  showAddRoomDialog.value = true;
  originalRoom.value = {
    ...newRoom.value,
    buildingId: selectedBuildingId.value,
  };
};

const saveRoom = async () => {
  let buildingId = props.buildingId; // Directly use the selected category ID

  if (!buildingId) {
    message.value = "Building not found or not selected.";
    return;
  }

  // Prepare the room data for saving
  const roomData = {
    roomNo: newRoom.value.title,
    buildingId: props.buildingId, // Make sure this is getting set correctly
  };

  try {
    if (editingRoom.value) {
      await RoomServices.update(newRoom.value.roomId, roomData);
      snackbarText.value = "Room updated successfully.";
    } else {
      await RoomServices.create(roomData);
      snackbarText.value = "Room added successfully.";
    }
    snackbar.value = true; // Show the snackbar
    message.value = "Room saved successfully.";
    await retrieveRooms();
  } catch (error) {
    message.value = `Error saving room: ${error.message || "Unknown error"}`;
  } finally {
    resetForm(); // Ensure form is reset here
    showAddRoomDialog.value = false; // Close dialog in finally to ensure it closes
  }
};

const resetForm = () => {
  newRoom.value = { roomNo: "", buildingId: "", id: null }; // Explicitly set `id` to `null`
  selectedBuildingId.value = "";
  validRoom.value = false;
  validBuilding.value = false;
  editingRoom.value = false; // Explicitly reset editing flag
  originalRoom.value = {}; // Reset the original room
};

const closeRoomDialog = () => {
  resetForm(); // Resets form when closing or canceling the dialog
  showAddRoomDialog.value = false;
};

const openAddRoomDialog = () => {
  resetForm(); // Ensure form is reset when dialog is opened
  showAddRoomDialog.value = true;
};

const archiveRoom = async (roomId) => {
  const archiveData = {
    activeStatus: false, // The new value for the activeStatus field
  };
  try {
    await RoomServices.update(roomId, archiveData);
    snackbarText.value = "Room archived successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of rooms after successful deletion
    retrieveRooms();
    rooms.value = rooms.value.filter((c) => c.id !== roomId);
  } catch (error) {
    message.value = "Error archiving room.";
  }
};

const activateRoom = async (roomId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await RoomServices.update(roomId, activateData);
    snackbarText.value = "Room activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of Rooms after successful deletion
    retrieveRooms();
    rooms.value = rooms.value.filter((c) => c.id !== roomId);
  } catch (error) {
    message.value = "Error activating room.";
  }
};

const baseRoomHeaders = ref([
  { title: "Room No.", key: "title" },
  { title: "Building", key: "buildingName" },
  { title: "View Room Details", key: "view" },
]);

const roomHeaders = computed(() => {
  const headers = [...baseRoomHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedRoomHeaders = computed(() => {
  const headers = [...baseRoomHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

const hasRoomChanged = computed(() => {
  // Check if any property of the room has changed
  const roomDetailsChanged = Object.keys(newRoom.value).some(
    (key) => newRoom.value[key] !== originalRoom.value[key]
  );

  // Check if the selected building has changed (or changed back)
  const buildingChanged =
    selectedBuildingId.value !== originalRoom.value.buildingId;

  return roomDetailsChanged || buildingChanged;
});

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

const openArchiveDialog = (item) => {
  itemToArchive.value = item;
  showArchiveDialog.value = true;
};

const confirmArchive = async () => {
  if (itemToArchive.value.type === "building") {
    await archiveBuilding(itemToArchive.value.id);
  } else if (itemToArchive.value.type === "room") {
    await archiveRoom(itemToArchive.value.id);
  }
  showArchiveDialog.value = false;
  itemToArchive.value = null; // Reset after deletion
};

const openActivateDialog = (item) => {
  itemToActivate.value = item;
  showActivateDialog.value = true;
};

const confirmActivate = async () => {
  if (itemToActivate.value.type === "building") {
    await activateBuilding(itemToActivate.value.id);
  } else if (itemToActivate.value.type === "room") {
    await activateRoom(itemToActivate.value.id);
  }
  showActivateDialog.value = false;
  itemToActivate.value = null; // Reset after deletion
};

const goBack = () => {
  router.replace("/facilityManage");
};

// Watch for changes on selectedTab
watch(selectedTab, (newValue) => {
  if (newValue === "Rooms") {
    retrieveRooms();
  } else if (newValue === "Assets") {
    retrieveBuildingAssets();
  }
});

// Watch for changes in selectedStatus when in the "Rooms" tab
watch([selectedStatus, selectedTab], ([statusValue, tabValue]) => {
  if (tabValue === "Rooms") {
    retrieveRooms();
  }
});

// Watch for changes in selectedTime when in the "Assets" tab
watch([selectedTime, selectedTab], ([timeValue, tabValue]) => {
  if (tabValue === "Assets") {
    retrieveBuildingAssets();
  }
});

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrieveBuildingDetails();
  await retrieveBuildings();
  await retrieveRooms();
  retrieveBuildingAssets();
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
            <v-toolbar-title>{{ buildingDetails.name }} x</v-toolbar-title>
          </v-toolbar>
          <v-divider style="width: 80%; height: 3px"></v-divider>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="4">
          Abreviation : {{ buildingDetails.abbreviation }}
        </v-col>
        <v-col cols="4"> Function : {{ buildingDetails.function }} </v-col>
        <v-col cols="4"> Year Built : {{ buildingDetails.yearBuilt }} </v-col>
        <v-col cols="4"> Square Feet: {{ buildingDetails.squareFeet }} </v-col>
        <v-col cols="4">
          Number of Stories: {{ buildingDetails.numStories }}
        </v-col>
        <v-col cols="4">
          Elevator: {{ buildingDetails.elevator ? "Yes" : "No" }}
        </v-col>
        <v-col cols="4">
          Fire Monitor: {{ buildingDetails.hasFireMonitor ? "Yes" : "No" }}
        </v-col>
        <v-col cols="4">
          Smoke Alarm: {{ buildingDetails.hasSmokeAlarm ? "Yes" : "No" }}
        </v-col>
        <v-col cols="4">
          Smoke Alarm Notes: {{ buildingDetails.fireSmokeNotes }}
        </v-col>
        <v-col cols="4">
          Construction Type:
          {{ buildingDetails.constructionType }}
        </v-col>
        <v-col cols="4">
          Roof Type:
          {{ buildingDetails.roofType }}
        </v-col>
        <v-col cols="4">
          Building Value: {{ buildingDetails.buildingValue }}
        </v-col>
        <v-col cols="4">
          Building BPP: {{ buildingDetails.buildingBPP }}
        </v-col>
        <v-col cols="12">
          Renovation Notes: {{ buildingDetails.renovationNotes }}
        </v-col>
      </v-row>

      <!-- Introducing a spacer row for visual separation -->
      <v-row class="my-1"></v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="selectedTab" background-color="primary" dark>
            <v-tab value="Rooms" color="primary">Rooms</v-tab>
            <v-tab value="Assets" color="primary">Assets</v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row v-if="selectedTab === 'Rooms'">
        <v-col cols="12">
          <v-tabs v-model="selectedStatus" background-color="primary" dark>
            <v-tab value="Active" color="primary">Active</v-tab>
            <v-tab value="Archived" color="primary">Archived</v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row v-if="selectedTab === 'Assets'">
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
            <div v-if="selectedTab === 'Rooms' && selectedStatus === 'Active'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active Rooms</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="openAddRoomDialog"
                    >
                      Add New Room to {{ buildingDetails.name }}
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="roomHeaders"
                    :items="filterRoomsByBuildingId()"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="roomsSortBy"
                  >
                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editRoom(item)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.archive="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="
                          openArchiveDialog({
                            id: item.key,
                            type: 'room',
                          })
                        "
                      >
                        <v-icon>mdi-arrow-down-box</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.view="{ item }">
                      <div
                        class="d-flex align-center justify-start"
                        style="padding-left: 15%"
                      >
                        <v-btn
                          icon
                          class="table-icons"
                          @click="viewRoom(item.key)"
                        >
                          <v-icon>mdi-eye</v-icon>
                        </v-btn>
                      </div>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- Archived rooms Section -->
            <div
              v-if="selectedTab === 'Rooms' && selectedStatus === 'Archived'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Archived Rooms</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedRoomHeaders"
                    :items="filterRoomsByBuildingId()"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="roomsSortBy"
                  >
                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editRoom(item)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.activate="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="
                          openActivateDialog({
                            id: item.key,
                            type: 'room',
                          })
                        "
                      >
                        <v-icon>mdi-arrow-up-box</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.view="{ item }">
                      <div
                        class="d-flex align-center justify-start"
                        style="padding-left: 15%"
                      >
                        <v-btn
                          icon
                          class="table-icons"
                          @click="viewRoom(item.key)"
                        >
                          <v-icon>mdi-eye</v-icon>
                        </v-btn>
                      </div>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- Current buildingAssets Section -->
            <div v-if="selectedTab === 'Assets' && selectedTime === 'Current'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span
                    >Current Assets Assigned to {{ buildingDetails.name }}</span
                  >
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="currentBuildingAssetHeaders"
                    :items="filterBuildingAssetsByBuildingId()"
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

            <!-- Past buildings Assets Section -->
            <div v-if="selectedTab === 'Assets' && selectedTime === 'Past'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span
                    >Past Assets Assigned to {{ buildingDetails.name }}</span
                  >
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="pastBuildingAssetHeaders"
                    :items="filterBuildingAssetsByBuildingId()"
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

    <!-- Add/Edit Room Dialog -->
    <v-dialog v-model="showAddRoomDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">{{ editingRoom ? "Edit" : "Add" }} Room</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="formRoom" v-model="validRoom">
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    label="Room No"
                    variant="outlined"
                    v-model="newRoom.title"
                    :rules="[rules.required, rules.roomNumber]"
                    maxlength="4"
                    counter
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <!-- Use the validRoom model to control the disabled state -->
          <v-btn color="cancelgrey" text @click="closeRoomDialog">Cancel</v-btn>
          <v-btn
            color="saveblue"
            @click="saveRoom"
            :disabled="!validRoom || !hasRoomChanged"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Archive Dialog -->
    <v-dialog v-model="showArchiveDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">Confirm Archive</v-card-title>
        <v-card-text>Are you sure you want to archive this item? </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="showArchiveDialog = false"
            >Cancel</v-btn
          >
          <v-btn color="saveblue" text @click="confirmArchive">Archive</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Activate Dialog -->
    <v-dialog v-model="showActivateDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">Confirm Activate</v-card-title>
        <v-card-text>Are you sure you want to activate this item? </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="showActivateDialog = false"
            >Cancel</v-btn
          >
          <v-btn color="saveblue" text @click="confirmActivate">Activate</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
