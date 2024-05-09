<script setup>
import LogServices from "../services/logServices";
import SerializedAssetServices from "../services/serializedAssetServices";
import { ref, onMounted, watch, computed } from "vue";
import { useStore } from "vuex";
import { format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import moment from "moment-timezone";

const message = ref("");
const logs = ref([]);
const serializedAssets = ref([]);
const showAddLogDialog = ref(false);
const selectedSerializedAssetId = ref("");
const editingLog = ref(false);
const originalLog = ref({});
const validLog = ref(false);
const showDeleteConfirmDialog = ref(false);
const showNotesDialog = ref(false);
const itemToDelete = ref(null);
const itemToDisplay = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const logSortBy = ref([{ key: "serviceDate", order: "desc" }]);
const searchQuery = ref("");
const store = useStore();
const menu = ref(false);
const rawServiceDate = ref(null);
const canAdd = computed(() => {
  return store.getters.canAdd;
});
const rules = {
  required: (value) => !!value || "Required.",
  maxNameLength: (value) =>
    value.length <= 40 || "Name cannot exceed 40 characters",
  maxDescLength: (value) => value.length <= 255,
  maxCounter: (value) => value.length <= 7,
  minCounter: (value) =>
    value.length >= 7 || "ID number must be 7 numbers long",
  idNumber: (value) =>
    /^[0-9]{7}$/.test(value) || "ID number must contain only numbers",
  email: (value) => {
    const pattern = /^[a-zA-Z]+(?:\.[a-zA-Z]+)?@(?:eagles\.)?oc\.edu$/;
    return pattern.test(value) || "e-mail must be eagles.oc.edu or oc.edu.";
  },
};
const newLog = ref({
  serializedAssetId: "",
  serviceDate: null,
  performedBy: "",
  notes: "",
  type: null, // "preventative", "repair", or "upgrade"
});


// LogsSection

// Retrieve People from Database
const retrieveLogs = async () => {
  try {
    const response = await LogServices.getAll();
    logs.value = response.data.map((log) => ({
      key: log.logId,
      serializedAssetId: log.serializedAssetId,
      serviceDate: log.serviceDate,
      notes: log.notes,
      performedBy: log.performedBy,
      serializedAssetName: log.serializedAsset.serializedAssetName,
      serialNumber: log.serializedAsset.serialNumber,
      isPreventative: log.isPreventative,
      isRepair: log.isRepair,
      isUpgrade: log.isUpgrade
    }));
  } catch (error) {
    console.error("Error loading Logs:", error);
  }
};

// Retrieve SerializedAssets from Database
const retrieveSerializedAssets = async () => {
  try {
    const response = await SerializedAssetServices.getAll();
    serializedAssets.value = response.data
      .filter((asset) => asset.activeStatus !== false) // Filter out archived assets
      .map((serializedAsset) => {
        return {
          ...serializedAsset,
          title: serializedAsset.serializedAssetName,
          key: serializedAsset.serializedAssetId,
          profileName: serializedAsset.assetProfile
            ? serializedAsset.assetProfile.profileName
            : "", // Make sure to handle potential undefined profile
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort by serializedAssetName
  } catch (error) {
    console.error("Error loading serialized assets:", error);
    message.value = "Failed to load serializedAssets.";
  }
};

const editLog = async (log) => {
  newLog.value = {
    key: log.key,
    serializedAssetId: log.serializedAssetId,
    serviceDate: log.serviceDate,
    performedBy: log.performedBy,
    notes: log.notes,
    type: log.isPreventative ? "preventative" : log.isRepair ? "repair" : "upgrade",
  };
  editingLog.value = true;

  // Find the serialized asset object that matches the serializedAssetId
  const matchingAsset = serializedAssets.value.find(
    (asset) => asset.key === log.serializedAssetId
  );

  selectedSerializedAssetId.value = matchingAsset; // Set the full object here

  showAddLogDialog.value = true;
  originalLog.value = { ...newLog.value }; // Store original log to check for changes
  rawServiceDate.value = new Date(log.serviceDate);
};

const saveLog = async () => {
  let formattedServiceDate = null;
  if (rawServiceDate.value) {
    // Convert local date to UTC before storing
    formattedServiceDate = format(
      new Date(rawServiceDate.value),
      "MMM dd, yyyy"
    );
  }

  const logData = {
    serviceDate: formattedServiceDate,
    performedBy: newLog.value.performedBy,
    notes: newLog.value.notes,
    serializedAssetId: selectedSerializedAssetId.value.key,
    isPreventative: newLog.value.type === "preventative",
    isRepair: newLog.value.type === "repair",
    isUpgrade: newLog.value.type === "upgrade",
  };

  try {
    let response;
    if (editingLog.value) {
      // Update log entry
      response = await LogServices.update(newLog.value.key, logData);
      snackbarText.value = "Log updated successfully.";
    } else {
      // Create new log entry
      response = await LogServices.create(logData);
      snackbarText.value = "Log added successfully.";
    }
    snackbar.value = true; // Show the snackbar
    retrieveLogs(); // Refresh log list
  } catch (error) {
    console.error("Error saving Log:", error);
    message.value = `Error saving log: ${error.message || "Unknown error"}`;
  } finally {
    editingLog.value = false;
    showAddLogDialog.value = false;
    resetLogForm(); // Reset the form fields
  }
};

const deleteLog = async (logId) => {
  try {
    await LogServices.delete(logId);
    snackbarText.value = "Maintenance Log deleted successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of people after successful deletion
    retrieveLogs();
    logs.value = logs.value.filter((t) => t.logId !== logId);
  } catch (error) {
    console.error(error);
    message.value = "Error deleting log.";
  }
};

function resetLogForm() {
  newLog.value = {
    serializedAssetId: "",
    serviceDate: null,
    performedBy: "",
    notes: "",
    isPreventative: false,
    isRepair: false,
    isUpgrade: false,
  };
  selectedSerializedAssetId.value = "";
  rawServiceDate.value = null;
}

const openAddLogDialog = () => {
  resetLogForm();
  editingLog.value = false; // Ensure we are in "add" mode
  showAddLogDialog.value = true; // Open the dialog
};

const closeLogDialog = () => {
  resetLogForm();
  showAddLogDialog.value = false;
  editingLog.value = false;
};

const baseMaintenanceHeaders = ref([
  { title: "Serialized Asset", key: "serializedAssetName" },
  { title: "Date Performed", key: "serviceDate" },
  { title: "Performed By", key: "performedBy" },
  { title: "Type", key: "type" },
  { title: "View Notes", key: "view" },
]);

const dynamicHeaders = computed(() => {
  const headers = [...baseMaintenanceHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canDelete) {
    headers.push({ title: "Delete", key: "delete", sortable: false });
  }

  return headers;
});

const filteredLogs = computed(() => {
  let result = logs.value;

  // Further filter by search query if present
  if (searchQuery.value) {
    result = result.filter((log) =>
      `${log.serializedAssetName}`
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase())
    );
  }

  return result;
});

const scrollToLog = () => {
  const searchLower = searchQuery.value.toLowerCase();
  const matchedLog = filteredLogs.value.find((log) =>
    `${log.serializedAssetName}`.toLowerCase().includes(searchLower)
  );

  if (matchedLog) {
    const selector = `[data-log-id="${matchedLog.key}"]`;
    const logElement = document.querySelector(selector);
    if (logElement) {
      logElement.scrollIntoView({ behavior: "smooth" });
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

const highlightedLogs = computed(() => {
  return filteredLogs.value.map((log) => ({
    ...log,
    serializedAssetName: highlightText(log.serializedAssetName)
  }));
});

const hasLogChanged = computed(() => {
  const isNewLogChanged = Object.keys(newLog.value).some(
    (key) => newLog.value[key] !== originalLog.value[key]
  );
  const isSerializedAssetChanged =
    selectedSerializedAssetId.value.key !== originalLog.value.serializedAssetId;
  return isNewLogChanged || isSerializedAssetChanged;
});

// Misc Section

const formatDate = (dateString) => {
  return moment.utc(dateString).format("MMM DD, YYYY");
};

const openDeleteConfirmDialog = (item) => {
  itemToDelete.value = item;
  showDeleteConfirmDialog.value = true;
};

const confirmDelete = async () => {
  if (itemToDelete.value.type === "log") {
    await deleteLog(itemToDelete.value.id);
  }
  showDeleteConfirmDialog.value = false;
  itemToDelete.value = null; // Reset after deletion
  await retrieveLogs();
};

const openShowNotesDialog = (item) => {
  itemToDisplay.value = item;
  showNotesDialog.value = true;
};

// Computed property for display
const formattedServiceDate = computed(() => {
  if (rawServiceDate.value) {
    // Display the date in a readable format
    return moment.utc(rawServiceDate.value).format("MMM DD, YYYY");
  }
  return "";
});

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrieveLogs();
  await retrieveSerializedAssets();
  console.log("Known issues: editing not 100%");
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Maintenance </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row class="my-1"></v-row>

      <v-row>
        <!-- Right align the search filter by using offset -->
        <v-col cols="12" md="8" offset-md="0">
          <v-text-field
            v-model="searchQuery"
            label="Search By Serialized Asset"
            variant="outlined"
            prepend-icon="mdi-cellphone-settings"
            dense
            clearable
            @input="scrollToLog"
            class="pt-0"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <div>
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Full Maintenance History</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="openAddLogDialog()"
                    >
                      Record Maintenance
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="dynamicHeaders"
                    :items="highlightedLogs"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="logSortBy"
                  >
                    <template v-slot:item.serializedAssetName="{ item }">
                      <span v-html="item.serializedAssetName"></span>
                    </template>
                    <template v-slot:item.serviceDate="{ item }">
                      <td>{{ formatDate(item.serviceDate) }}</td>
                    </template>
                    <template v-slot:item.type="{ item }">
    <td>
      <span v-if="item.isPreventative">Preventative</span>
      <span v-else-if="item.isRepair">Repair</span>
      <span v-else-if="item.isUpgrade">Upgrade</span>
    </td>
  </template>
                    <template v-slot:item.view="{ item }">
                      <v-btn icon class="table-icons" 
                      @click="openShowNotesDialog({
                            id: item.key,
                            type: 'log',
                            notes: item.notes,
                            serializedAssetName: item.serializedAssetName,
                            serviceDate: item.serviceDate
                      })">
                        <v-icon>mdi-note-text</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editLog(item)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.delete="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="
                          openDeleteConfirmDialog({
                            id: item.key,
                            type: 'log',
                          })
                        "
                      >
                        <v-icon color="primary">mdi-delete</v-icon>
                      </v-btn>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>
          </v-fade-transition>
        </v-col>
      </v-row>
    </v-container>

    <!-- Add/Edit Log Dialog -->
    <v-dialog v-model="showAddLogDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline"
            >{{ editingLog ? "Edit" : "Add" }} Maintenance Log</span
          >
        </v-card-title>
        <v-card-text>
          <v-form ref="formPerson" v-model="validLog">
            <v-container id="attach">
              <v-row>
                <v-col cols="12">
                  <!-- Serialized Asset Selection -->
                  <v-autocomplete
                    label="Select Serialized Asset"
                    variant="outlined"
                    prepend-icon="mdi-cellphone-settings"
                    :items="serializedAssets"
                    v-model="selectedSerializedAssetId"
                    item-text="title"
                    item-value="key"
                    :rules="[rules.required]"
                    clearable
                    return-object
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Performed By"
                    variant="outlined"
                    prepend-icon="mdi-account"
                    v-model="newLog.performedBy"
                    :rules="[rules.required, rules.maxNameLength]"
                    maxlength="40"
                    counter
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-menu
                    v-model="menu"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ attrs }">
                      <v-text-field
                        v-model="formattedServiceDate"
                        label="Service Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="menu = !menu"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="rawServiceDate"
                      @input="menu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
                <v-row>
  <v-col cols="12">
    <v-radio-group v-model="newLog.type" row>
      <v-radio label="Preventative" value="preventative"></v-radio>
      <v-radio label="Repair" value="repair"></v-radio>
      <v-radio label="Upgrade" value="upgrade"></v-radio>
    </v-radio-group>
  </v-col>
</v-row>

                <v-col cols="12">
                  <v-textarea
                    label="Notes"
                    variant="outlined"
                    v-model="newLog.notes"
                    :rules="[rules.maxDescLength]"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-textarea>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="closeLogDialog">Cancel</v-btn>
          <!-- Temporarily removed hasLogChanged from disabled -->
          <v-btn color="saveblue" @click="saveLog" :disabled="!validLog"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteConfirmDialog" max-width="500px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Confirm Deletion</v-card-title
        >
        <v-card-text
          >Are you sure you want to delete this maintenance log?</v-card-text
        >
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="cancelgrey"
            text
            @click="showDeleteConfirmDialog = false"
            >Cancel</v-btn
          >
          <v-btn color="primary" text @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showNotesDialog" max-width="500px">
  <v-card class="pa-4 rounded-xl">
    <v-card-title class="justify-space-between">
      Notes for {{ itemToDisplay.serializedAssetName }}
    </v-card-title>
    <v-card-text>
      {{ itemToDisplay.notes }}
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="cancelgrey"
        text
        @click="showNotesDialog = false"
      >
        Close
      </v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
