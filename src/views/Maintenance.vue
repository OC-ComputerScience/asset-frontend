<script setup>
import LogServices from "../services/logServices";
import SerializedAssetServices from "../services/serializedAssetServices";
import { ref, onMounted, watch, computed } from "vue";
import { useStore } from "vuex";
import { format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import moment from "moment-timezone";
import logServices from "../services/logServices";

const message = ref("");
const logs = ref([]);
const logsCopy = ref([]);
const serializedAssets = ref([]);
const showAddLogDialog = ref(false);
const selectedSerializedAssetId = ref("");
const editingLog = ref(false);
const originalLog = ref({});
const validLog = ref(false);
const showNotesDialog = ref(false);
const itemToDisplay = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const logSortBy = ref([{ key: "serviceDate", order: "desc" }]);
const searchQuery = ref("");
const searchDate = ref(null);
const store = useStore();
const menu = ref(false);
const selectPrev = ref(false);
const menuScheduled = ref(false);
const rawServiceDate = ref(null);
const rawScheduledDate = ref(null);
const showDeleteDialog = ref(false);
const canAdd = computed(() => {
  return store.getters.canAdd;
});
const rules = {
  requiredSelectedAsset: (value) => !!value || "Asset is required.",
  required: (value) =>
    (!!value && newLog.value.type != "preventative") ||
    newLog.value.type == "preventative" ||
    "Required.",
  requiredScheudledDate: (value) =>
    (!!value && newLog.value.type == "preventative") ||
    "Scheduled Date is required.",
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
  scheduledDate: null,
  performedBy: "",
  notes: "",
  description: "",
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
      scheduledDate: log.scheduledDate,
      notes: log.notes,
      description: log.description,
      performedBy: log.performedBy,
      serializedAssetName: log.serializedAsset.serializedAssetName,
      serialNumber: log.serializedAsset.serialNumber,
      isPreventative: log.isPreventative,
      isRepair: log.isRepair,
      isUpgrade: log.isUpgrade,
    }));
    logsCopy.value = logs.value;
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
    scheduledDate: log.scheduledDate,
    performedBy: log.performedBy,
    notes: log.notes,
    description: log.description,
    type: log.isPreventative
      ? "preventative"
      : log.isRepair
      ? "repair"
      : "upgrade",
  };
  editingLog.value = true;

  // Find the serialized asset object that matches the serializedAssetId
  const matchingAsset = serializedAssets.value.find(
    (asset) => asset.key === log.serializedAssetId
  );

  selectedSerializedAssetId.value = matchingAsset; // Set the full object here

  showAddLogDialog.value = true;
  originalLog.value = { ...newLog.value }; // Store original log to check for changes
  rawServiceDate.value =
    log.serviceDate == null ? null : new Date(log.serviceDate);
  rawScheduledDate.value =
    log.scheduledDate === null ? null : new Date(log.scheduledDate);
};

const saveLog = async () => {
  let formattedServiceDate = null;
  let formattedScheduledDate = null;
  if (rawServiceDate.value) {
    // Convert local date to UTC before storing
    formattedServiceDate = format(
      new Date(rawServiceDate.value),
      "MMM dd, yyyy"
    );
  }
  if (rawScheduledDate.value) {
    // Convert local date to UTC before storing
    formattedScheduledDate = format(
      new Date(rawScheduledDate.value),
      "MMM dd, yyyy"
    );
  }

  const logData = {
    serviceDate:
      newLog.value.type != "preventative" || editingLog
        ? formattedServiceDate
        : null,
    scheduledDate:
      newLog.value.type === "preventative" ? formattedScheduledDate : null,
    performedBy: newLog.value.performedBy,
    notes: newLog.value.notes,
    description: newLog.value.description,
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

function resetLogForm() {
  newLog.value = {
    serializedAssetId: "",
    serviceDate: null,
    scheduledDate: null,
    performedBy: "",
    notes: "",
    description: "",
    isPreventative: false,
    isRepair: false,
    isUpgrade: false,
  };
  selectedSerializedAssetId.value = "";
  rawServiceDate.value = null;
  rawScheduledDate.value = null;
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
  { title: "Scheduled Date", key: "scheduledDate" },
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
  if(store.getters.canDelete) {
    headers.push({title: "Delete", key: "delete", sortable: false});
  }

  return headers;
});

const filteredLogs = computed(() => {
  let result = logsCopy.value;

  // Further filter by search query if present
  if (searchQuery.value || selectPrev.value) {
    result = result.filter(
      (log) =>
        `${log.serializedAssetName}`
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) &&
        (!selectPrev.value || (log.isPreventative && log.serviceDate == null)) // Filter by preventative if selected
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

const formatDate = (dateString) => {
  return moment.utc(dateString).format("MMM DD, YYYY");
};

const openShowNotesDialog = (item) => {
  itemToDisplay.value = item;
  showNotesDialog.value = true;
};

const openDeleteDialog = (item) => {
  itemToDisplay.value = item;
  showDeleteDialog.value = true;
}

const deleteLog = async() => {
  const id = itemToDisplay.value.key;
  await logServices.delete(id);
  showDeleteDialog.value = false;
  await retrieveLogs()
}

const searchByDate = () => {
  logsCopy.value = logs.value.filter((log) => {
    return formatDate(log.serviceDate) === formatDate(searchDate.value)
  })

}
const clearDate = () => {
  logsCopy.value = logs.value;
}

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrieveLogs();
  await retrieveSerializedAssets();
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

      <v-row class="ma-0">
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
            class="pa-0"
          ></v-text-field>
          <v-checkbox
            class="ml-5 mt-0 mb-0 pa-0"
            v-model="selectPrev"
            label="Only Preventative Not Done"
            density="compact"
          >
          </v-checkbox>
        </v-col>
        <v-col cols="12" md="4">
          <v-date-input
            v-model="searchDate"
            clearable
            label="Search by Date Performed"
            variant="outlined"
            color="blue"
            prepend-icon="mdi-calendar"
            @update:modelValue="searchByDate"
            @click:clear="clearDate"
          ></v-date-input>
        </v-col>
      </v-row>

      <v-row class="ma-0">
        <v-col class="ma-0" cols="12">
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
                    :items="filteredLogs"
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
                      <td>
                        {{
                          item.serviceDate == null
                            ? null
                            : formatDate(item.serviceDate)
                        }}
                      </td>
                    </template>
                    <template v-slot:item.scheduledDate="{ item }">
                      <td>
                        {{
                          item.scheduledDate == null
                            ? null
                            : formatDate(item.scheduledDate)
                        }}
                      </td>
                    </template>
                    <template v-slot:item.type="{ item }">
                      <td>
                        <span v-if="item.isPreventative">Preventative</span>
                        <span v-else-if="item.isRepair">Repair</span>
                        <span v-else-if="item.isUpgrade">Upgrade</span>
                      </td>
                    </template>
                    <template v-slot:item.view="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="
                          openShowNotesDialog({
                            id: item.key,
                            type: 'log',
                            notes: item.notes,
                            serializedAssetName: item.serializedAssetName,
                            serviceDate: item.serviceDate,
                            scheduledDate: item.scheduledDate,
                            description: item.description,
                          })
                        "
                      >
                        <v-icon>mdi-note-text</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editLog(item)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.delete="{ item }">
                      <v-btn icon class="table-icons" @click="openDeleteDialog(item)">
                        <v-icon>mdi-trash-can</v-icon>
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
                    :rules="[rules.requiredSelectedAsset]"
                    clearable
                    return-object
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    label="Description"
                    variant="outlined"
                    v-model="newLog.description"
                    :rules="[rules.maxDescLength]"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-textarea>
                </v-col>
                <v-row>
                  <v-col cols="12">
                    <v-radio-group v-model="newLog.type" inline :disabled="editingLog">
                      <v-radio
                        label="Preventative"
                        value="preventative"
                      ></v-radio>
                      <v-radio label="Repair" value="repair"></v-radio>
                      <v-radio label="Upgrade" value="upgrade"></v-radio>
                    </v-radio-group>
                  </v-col>
                </v-row>

                <v-col v-if="newLog.type == 'preventative'" cols="12">
                  Service Date
                  <v-date-input
                    v-model="rawScheduledDate"
                    clearable
                    label="Scheduled Date (PM)"
                    variant="outlined"
                    color="blue"
                    :rules="[rules.requiredScheudledDate]"
                  ></v-date-input>
                </v-col>
                <v-col
                  v-if="
                    editingLog ||
                    (!editingLog &&
                      newLog.type != 'preventative' &&
                      newLog.type != null)
                  "
                  cols="12"
                >
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
                <v-col
                  v-if="
                    editingLog ||
                    (!editingLog &&
                      newLog.type != 'preventative' &&
                      newLog.type != null)
                  "
                  cols="12"
                >
                  <v-date-input
                    v-model="rawServiceDate"
                    clearable
                    label="Service Date"
                    variant="outlined"
                    color="blue"
                    :rules="[rules.required]"
                  ></v-date-input>
                </v-col>
                <v-col
                  v-if="
                    editingLog ||
                    (!editingLog &&
                      newLog.type != 'preventative' &&
                      newLog.type != null)
                  "
                  cols="12"
                >
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
          <v-btn color="cancelgrey" text @click="showNotesDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteDialog" max-width="500px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Confirm Archive</v-card-title
        >
        <v-card-text>Are you sure you want to delete this log? </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="showDeleteDialog = false"
            >Cancel</v-btn
          >
          <v-btn color="saveblue" text @click="deleteLog">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
