<script setup>
import BuildingServices from "../services/buildingServices";
import RoomServices from "../services/roomServices";
import { ref, onMounted, watch, computed } from "vue";
import router from "../router";
import { useStore } from "vuex";

const message = ref("");
const selectedTab = ref("Rooms");
const selectedStatus = ref("Active");
const buildings = ref([]);
const rooms = ref([]);
const showAddBuildingDialog = ref(false);
const showAddRoomDialog = ref(false);
const editingBuilding = ref(false);
const editingRoom = ref(false);
const originalBuilding = ref({});
const originalRoom = ref({});
const selectedBuildingId = ref("");
const selectedFilterBuildingId = ref("");
const validBuilding = ref(false);
const validRoom = ref(false);
const showArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const itemToArchive = ref(null);
const itemToActivate = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const searchQuery = ref("");
const buildingsSortBy = ref([{ key: "title", order: "asc" }]);
const roomsSortBy = ref([{ key: "title", order: "asc" }]);
const dataLoaded = ref(false);
const store = useStore();
const canAdd = computed(() => {
  return store.getters.canAdd;
});
const rules = {
  required: (value) => !!value || "Required.",
  maxNameLength: (value) => value.length <= 80,
  maxNotesLength: (value) => value.length <= 255,
  roomNumber: (value) =>
    /^[a-zA-Z0-9]{2,4}$/.test(value) ||
    "Room number must be between 2 and 4 characters long.",

  buildingAbbreviation: (value) => {
    const pattern = /^[a-zA-Z]{2,3}$/;
    return (
      pattern.test(value) || "Building Abbreviation must be 2 or 3 characters"
    );
  },
  numberic: (value) => {
    return null || /^[0-9]*$/.test(value) || "Value must be a number";
  },
  money: (value) => {
    return (
      !value ||
      /^[0-9]+(\.[0-9]{1,2})?$/.test(value) ||
      "Value must be a money amount"
    );
  },
};

const newBuilding = ref({
  title: "",
  abbreviation: "",
  activeStatus: true,
  function: "",
  yearBuilt: null,
  squareFeet: null,
  numStories: null,
  hasElevator: false,
  hasFireMonitor: false,
  hasSmokeAlarm: false,
  fireSmokeNotes: "",
  constructionType: "",
  roofType: "",
  buildingValue: null,
  buildingBPP: null,
  renovationNotes: "",
});
const newRoom = ref({
  title: "",
  buildingId: "",
});

// *** Buildings Section ***

// Retrieve Buildings from Database
const retrieveBuildings = async () => {
  try {
    const response = await BuildingServices.getAll();
    buildings.value = response.data
      .map((building) => ({
        title: building.name,
        key: building.buildingId,
        abbreviation: building.abbreviation,
        activeStatus: building.activeStatus,
        function: building.function,
        yearBuilt: building.yearBuilt,
        squareFeet: building.squareFeet,
        numStories: building.numStories,
        hasElevator: building.hasElevator,
        hasFireMonitor: building.hasFireMonitor,
        fireSmokeNotes: building.fireSmokeNotes,
        hasSmokeAlarm: building.hasSmokeAlarm,
        constructionType: building.constructionType,
        roofType: building.roofType,
        buildingValue: building.buildingValue,
        buildingBPP: building.buildingBPP,
        noOfRooms: building.noOfRooms,
        renovationNotes: building.renovationNotes,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)); // Sorting buildings by name
  } catch (error) {
    console.error("Error loading buildings:", error);
  }
};

const editBuilding = async (building) => {
  newBuilding.value = {
    title: building.title,
    abbreviation: building.abbreviation,
    activeStatus: building.activeStatus,
    function: building.function,
    buildingId: building.key,
    yearBuilt: building.yearBuilt,
    squareFeet: building.squareFeet,
    numStories: building.numStories,
    hasElevator: building.hasElevator,
    hasFireMonitor: building.hasFireMonitor,
    fireSmokeNotes: building.fireSmokeNotes,
    hasSmokeAlarm: building.hasSmokeAlarm,
    constructionType: building.constructionType,
    roofType: building.roofType,
    buildingValue: building.buildingValue,
    buildingBPP: building.buildingBPP,
    renovationNotes: building.renovationNotes,
  };
  editingBuilding.value = true;
  showAddBuildingDialog.value = true;
  originalBuilding.value = { ...newBuilding.value };
};

const saveBuilding = async () => {
  const buildingData = {
    name: newBuilding.value.title,
    abbreviation: newBuilding.value.abbreviation,
    activeStatus: newBuilding.value.activeStatus,
    function: newBuilding.value.function,
    buildingId: newBuilding.value.key,
    yearBuilt:
      newBuilding.value.yearBuilt == "" ? null : newBuilding.value.yearBuilt,
    squareFeet:
      newBuilding.value.squareFeet == "" ? null : newBuilding.value.squareFeet,
    numStories:
      newBuilding.value.numStories == "" ? null : newBuilding.value.numStories,
    hasElevator: newBuilding.value.hasElevator,
    hasFireMonitor: newBuilding.value.hasFireMonitor,
    fireSmokeNotes: newBuilding.value.fireSmokeNotes,
    hasSmokeAlarm: newBuilding.value.hasSmokeAlarm,
    constructionType: newBuilding.value.constructionType,
    roofType: newBuilding.value.roofType,
    buildingValue:
      newBuilding.value.buildingValue == ""
        ? null
        : newBuilding.value.buildingValue,
    buildingBPP:
      newBuilding.value.buildingBPP == ""
        ? null
        : newBuilding.value.buildingBPP,
    renovationNotes: newBuilding.value.renovationNotes,
  };

  try {
    let response;
    if (editingBuilding.value) {
      response = await BuildingServices.update(
        newBuilding.value.buildingId,
        buildingData
      );
      snackbarText.value = "Building updated successfully.";
    } else {
      response = await BuildingServices.create(buildingData);
      snackbarText.value = "Building added successfully.";
    }
    snackbar.value = true; // Show the snackbar
    message.value = "Building saved successfully.";
    retrieveBuildings(); // Refresh buildings list
  } catch (error) {
    console.error("Error saving building:", error);
    message.value = `Error saving building: ${
      error.message || "Unknown error"
    }`;
  } finally {
    editingBuilding.value = false;
    showAddBuildingDialog.value = false;
    newBuilding.value = {
      title: "",
      abbreviation: "",
      title: "",
      activeStatus: true,
      function: "",
      yearBuilt: null,
      squareFeet: null,
      numStories: null,
      hasElevator: false,
      hasFireMonitor: false,
      fireSmokeNotes: "",
      hasSmokeAlarm: false,
      constructionType: null,
      roofType: null,
      buildingValue: null,
      buildingBPP: null,
      renovationNotes: "",
    };
  }
};

const closeBuildingDialog = () => {
  showAddBuildingDialog.value = false;
  editingBuilding.value = false;
  newBuilding.value = { name: "", abbreviation: "" };
  originalBuilding.value = {}; // Reset the original building
};

const archiveBuilding = async (buildingId) => {
  const archiveData = {
    activeStatus: false, // The new value for the activeStatus field
  };
  try {
    await BuildingServices.update(buildingId, archiveData);
    snackbarText.value = "Building archived successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of buildings after successful deletion
    retrieveBuildings();
    buildings.value = buildings.value.filter((c) => c.id !== buildingId);
  } catch (error) {
    console.error(error);
    message.value = "Error archiving building.";
  }
};

const activateBuilding = async (buildingId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await BuildingServices.update(buildingId, activateData);
    snackbarText.value = "Building activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of buildings after successful deletion
    retrieveBuildings();
    buildings.value = buildings.value.filter((c) => c.id !== buildingId);
  } catch (error) {
    console.error(error);
    message.value = "Error activating building.";
  }
};

function viewBuilding(buildingId) {
  router.push({ name: "buildingView", params: { buildingId: buildingId } });
}

const baseBuildingHeaders = ref([
  { title: "Building Name", key: "title" },
  { title: "Abbreviation", key: "abbreviation" },
  { title: "Function", key: "function" },
  { title: "No. of Rooms", key: "noOfRooms" },
  { title: "View Building", key: "view" },
]);

const buildingHeaders = computed(() => {
  const headers = [...baseBuildingHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedBuildingHeaders = computed(() => {
  const headers = [...baseBuildingHeaders.value];

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

const filteredBuildings = computed(() => {
  let result = buildings.value;

  if (selectedStatus.value === "Active") {
    result = result.filter((building) => building.activeStatus === true);
  } else if (selectedStatus.value === "Archived") {
    result = result.filter((building) => building.activeStatus === false);
  }

  if (searchQuery.value) {
    result = result.filter(
      (building) =>
        building.title
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) ||
        building.abbreviation
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase())
    );
  }

  return result;
});

const scrollToBuilding = () => {
  const searchLower = searchQuery.value.toLowerCase();
  const matchedBuilding = filteredBuildings.value.find(
    (building) =>
      building.title.toLowerCase().includes(searchLower) ||
      building.abbreviation.toLowerCase().includes(searchLower)
  );

  if (matchedBuilding) {
    const selector = `[data-building-id="${matchedBuilding.key}"]`;
    const buildingElement = document.querySelector(selector);
    if (buildingElement) {
      buildingElement.scrollIntoView({ behavior: "smooth" });
    }
  }
};

const highlightText = (text) => {
  if (!text) return "";
  const lowerSearchQuery = searchQuery.value.toLowerCase();
  if (!lowerSearchQuery) return text;
  const regex = new RegExp(`(${lowerSearchQuery})`, "gi");
  return text.replace(regex, '<mark class="custom-highlight">$1</mark>');
};

const highlightedBuildings = computed(() => {
  return filteredBuildings.value.map((building) => ({
    ...building,
    title: highlightText(building.title),
    abbreviation: highlightText(building.abbreviation),
  }));
});

const hasBuildingChanged = computed(() => {
  return Object.keys(newBuilding.value).some(
    (key) => newBuilding.value[key] !== originalBuilding.value[key]
  );
});

// *** Rooms Section ***

// Retrieve Rooms from Database
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
      };
    });
    rooms.value = enrichedRooms;
  } catch (error) {
    console.error("Error loading rooms:", error);
    message.value = "Failed to load rooms.";
  }
  finally {
    dataLoaded.value = true;
  }
};

const editRoom = (room) => {
  selectedBuildingId.value = room.buildingId; // Assuming you have this ID correctly set
  newRoom.value = {
    title: room.title,
    buildingId: room.buildingId,
    roomId: room.roomId,
    roomNo: room.roomNo,
    roomDescription: room.roomDescription,
    roomType: room.roomType,
  };
  editingRoom.value = true;
  showAddRoomDialog.value = true;
  originalRoom.value = {
    ...newRoom.value,
    buildingId: selectedBuildingId.value,
  };
};

const saveRoom = async () => {
  let buildingId = selectedBuildingId.value; // Directly use the selected category ID

  if (!buildingId) {
    console.error("Building not selected.");
    message.value = "Building not found or not selected.";
    return;
  }

  // Prepare the room data for saving
  const roomData = {
    roomNo: newRoom.value.title,
    buildingId: selectedBuildingId.value.key, // Make sure this is getting set correctly
    roomType: newRoom.value.roomType,
    roomDescription: newRoom.value.roomDescription,
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
    await retrieveBuildings();
  } catch (error) {
    console.error("Error saving room:", error);
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
    retrieveBuildings();
    rooms.value = rooms.value.filter((c) => c.id !== roomId);
  } catch (error) {
    console.error(error);
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
    retrieveBuildings();
    rooms.value = rooms.value.filter((c) => c.id !== roomId);
  } catch (error) {
    console.error(error);
    message.value = "Error activating room.";
  }
};

function viewRoom(roomId) {
  const sourcePage = "facilityManage";
  router.push({
    name: "roomView",
    params: { roomId: roomId },
    query: { sourcePage: sourcePage },
  });
}

const baseRoomHeaders = ref([
  { title: "Room No.", key: "roomName" },
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

  // if (store.getters.canEdit) {
  //   headers.push({ title: "Edit", key: "edit", sortable: false });
  // }

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

const filteredRooms = computed(() => {
  return rooms.value.filter((room) => {
    // Filter by selected building if any
    const buildingMatch = selectedFilterBuildingId.value
      ? room.buildingId === selectedFilterBuildingId.value.key
      : true;

    // Filter by active status
    let statusMatch = true;
    if (selectedStatus.value === "Active") {
      statusMatch = room.activeStatus === true;
    } else if (selectedStatus.value === "Archived") {
      statusMatch = room.activeStatus === false;
    }

    return buildingMatch && statusMatch;
  });
});

const onBuildingClear = () => {
  // Reset dependent filters or selections here
  selectedFilterBuildingId.value = "";
};

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

// A computed property that combines tab and status
const tabAndStatus = computed(() => {
  return { tab: selectedTab.value, status: selectedStatus.value };
});

// Watcher for both selectedTab and selectedStatus
watch(
  tabAndStatus,
  async (current) => {
    switch (current.tab) {
      case "Rooms":
        await retrieveBuildings();
        await retrieveRooms();
        break;
      case "Buildings":
        await retrieveBuildings();
        break;
      default:
        console.error("Unknown tab:", current.tab);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await retrieveBuildings();
  await retrieveRooms();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Facility Management </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="selectedTab" background-color="primary" dark>
            <v-tab value="Rooms" color="primary">
              <v-icon left class="mr-2">mdi-door</v-icon>
              Rooms
            </v-tab>
            <v-tab value="Buildings" color="primary">
              <v-icon left class="mr-2">mdi-domain</v-icon> Building
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="4">
          <v-tabs v-model="selectedStatus" background-color="primary" dark>
            <v-tab value="Active" color="primary">
              <v-icon left class="mr-2">mdi-lightning-bolt</v-icon>
              Active
            </v-tab>
            <v-tab value="Archived" color="primary">
              <v-icon left class="mr-2">mdi-archive</v-icon>
              Archived
            </v-tab>
          </v-tabs>
        </v-col>
        <v-col cols="12" md="8">
          <div v-if="selectedTab === 'Buildings'">
            <v-text-field
              v-model="searchQuery"
              label="Search by Building Name or Abbreviation"
              variant="outlined"
              dense
              clearable
              @input="scrollToBuilding"
              class="pt-0"
            ></v-text-field>
          </div>
        </v-col>
      </v-row>

      <!-- Rooms filter -->
      <div v-if="selectedTab === 'Rooms'">
        <v-row class="mt-3">
          <!-- Added margin-top class here -->
          <v-col cols="12">
            <v-autocomplete
              v-model="selectedFilterBuildingId"
              :items="buildings"
              item-text="title"
              item-value="key"
              label="Filter by Building"
              return-object
              clearable
              variant="outlined"
              @clear="onBuildingClear"
            ></v-autocomplete>
          </v-col>
        </v-row>
      </div>

      <v-row v-if="dataLoaded">
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Active Buildings Section -->
            <div
              v-if="selectedTab === 'Buildings' && selectedStatus === 'Active'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active Buildings</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="showAddBuildingDialog = true"
                    >
                      Add New Building
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="buildingHeaders"
                    :items="highlightedBuildings"
                    item-key="key"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="buildingsSortBy"
                  >
                    <template v-slot:item.title="{ item }">
                      <span v-html="item.title"></span>
                    </template>
                    <template v-slot:item.abbreviation="{ item }">
                      <span v-html="item.abbreviation"></span>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="editBuilding(item)"
                      >
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
                            type: 'building',
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
                          @click="viewBuilding(item.key)"
                        >
                          <v-icon>mdi-eye</v-icon>
                        </v-btn>
                      </div>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- Archived Buildings Section -->
            <div
              v-if="
                selectedTab === 'Buildings' && selectedStatus === 'Archived'
              "
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Archived Buildings</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedBuildingHeaders"
                    :items="filteredBuildings"
                    item-key="key"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="buildingsSortBy"
                  >
                    <template v-slot:item.activate="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="
                          openActivateDialog({
                            id: item.key,
                            type: 'building',
                          })
                        "
                      >
                        <v-icon>mdi-arrow-up-box</v-icon>
                      </v-btn>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

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
                      Add New Room
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="roomHeaders"
                    :items="filteredRooms"
                    item-key="key"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="roomsSortBy"
                  >
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
                    :items="filteredRooms"
                    item-key="key"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="roomsSortBy"
                  >
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
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>
          </v-fade-transition>
        </v-col>
      </v-row>
      <v-row v-else align="center" justify="center">
        <v-progress-circular
          color="blue"
          indeterminate
          :size="50"
        />
      </v-row>
    </v-container>

    <!-- Add/Edit Building Dialog -->
    <v-dialog v-model="showAddBuildingDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title>
          <span class="headline"
            >{{ editingBuilding ? "Edit" : "Add" }} Building</span
          >
        </v-card-title>
        <v-card-text>
          <v-form ref="formBuilding" v-model="validBuilding">
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    label="Building Name"
                    v-model="newBuilding.title"
                    variant="outlined"
                    :rules="[rules.required, rules.maxNameLength]"
                    maxlength="80"
                    counter
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    label="Building Abbreviation"
                    v-model="newBuilding.abbreviation"
                    variant="outlined"
                    :rules="[rules.required, rules.buildingAbbreviation]"
                    maxlength="3"
                    counter
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-combobox
                    label="Function"
                    v-model="newBuilding.function"
                    variant="outlined"
                    :items="[
                      'Admin',
                      'Academic',
                      'Athletic',
                      'Misc',
                      'Mixed',
                      'Plant',
                      'Residential',
                      'Other',
                    ]"
                  ></v-combobox>
                </v-col>

                <v-col cols="4">
                  <v-text-field
                    label="Year Built"
                    v-model="newBuilding.yearBuilt"
                    variant="outlined"
                    maxlength="4"
                    :rules="[rules.numberic]"
                  ></v-text-field>
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    label="Square Feet"
                    v-model="newBuilding.squareFeet"
                    variant="outlined"
                    maxlength="6"
                    :rules="[rules.numberic]"
                  ></v-text-field>
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    label="Number of Stories"
                    v-model="newBuilding.numStories"
                    variant="outlined"
                    maxlength="1"
                    :rules="[rules.numberic]"
                  ></v-text-field>
                </v-col>
                <v-col cols="4">
                  <v-checkbox
                    label="Elevator"
                    v-model="newBuilding.hasElevator"
                    variant="outlined"
                  ></v-checkbox>
                </v-col>
                <v-col cols="4">
                  <v-checkbox
                    label="Fire Monitor"
                    v-model="newBuilding.hasFireMonitor"
                    variant="outlined"
                  ></v-checkbox>
                </v-col>
                <v-col cols="4">
                  <v-checkbox
                    label="Smoke Alarm"
                    v-model="newBuilding.hasSmokeAlarm"
                    variant="outlined"
                  ></v-checkbox>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Fire/Smoke Notes"
                    v-model="newBuilding.fireSmokeNotes"
                    variant="outlined"
                    :rules="[rules.maxNotesLength]"
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-combobox
                    label="Construction Type"
                    v-model="newBuilding.constructionType"
                    variant="outlined"
                    :items="[
                      'Brick & Motar',
                      'Metal',
                      'Steel Frame / Brick',
                      'Wood Frame',
                      'Wood Frame/ Brick',
                      'Other',
                    ]"
                  ></v-combobox>
                </v-col>
                <v-col cols="6">
                  <v-combobox
                    label="Roof Type"
                    v-model="newBuilding.roofType"
                    variant="outlined"
                    :items="['Metal', 'Tar', 'TPO', 'Other']"
                  ></v-combobox>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    label="Buildiing Value"
                    v-model="newBuilding.buildingValue"
                    variant="outlined"
                    :rules="[rules.money]"
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    label="BPP Value"
                    v-model="newBuilding.buildingBPP"
                    variant="outlined"
                    :rules="[rules.money]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-area
                    label="Renovation Notes"
                    v-model="newBuilding.renovationNotes"
                    variant="outlined"
                    :rules="[rules.maxNotesLength]"
                  ></v-text-area>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="closeBuildingDialog"
            >Cancel</v-btn
          >
          <v-btn
            color="saveblue"
            @click="saveBuilding(newBuilding)"
            :disabled="!validBuilding || !hasBuildingChanged"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Room Dialog -->
    <v-dialog v-model="showAddRoomDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title>
          <span class="headline">{{ editingRoom ? "Edit" : "Add" }} Room</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="formRoom" v-model="validRoom">
            <v-container>
              <v-row>
                <v-col cols="12">
                  <!-- Building Selection -->
                  <v-autocomplete
                    label="Building"
                    :items="buildings"
                    v-model="selectedBuildingId"
                    variant="outlined"
                    item-text="title"
                    item-value="key"
                    :rules="[rules.required]"
                    clearable
                    return-object
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Room Number"
                    variant="outlined"
                    v-model="newRoom.title"
                    :rules="[rules.required, rules.roomNumber]"
                    maxlength="4"
                    counter
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Room Description"
                    variant="outlined"
                    v-model="newRoom.roomDescription"
                    maxlength="45"
                    counter
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-combobox
                    label="Room Type"
                    v-model="newRoom.roomType"
                    variant="outlined"
                    :items="[
                      'Auditorium',
                      'Classroom',
                      'Conference Room',
                      'Kitchen',
                      'Laboratory',
                      'Lobby',
                      'Lounge',
                      'Gym',
                      'Meeting Room',
                      'Office',
                      'Practice Room',
                      'Reception',
                      'Storage',
                      'Study Room',
                      'Therapy Room',
                      'Workroom',
                      'Other',
                    ]"
                  ></v-combobox>
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
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Confirm Archive</v-card-title
        >
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
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Confirm Activate</v-card-title
        >
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
