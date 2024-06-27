<script setup>
import LeaseServices from "../services/leaseServices";
import SerializedAssetServices from "../services/serializedAssetServices";
import { ref, onMounted, watch, computed } from "vue";
import { useStore } from "vuex";
import { format } from "date-fns";
import moment from "moment-timezone";

const message = ref("");
const selectedTab = ref("Active");
const leases = ref([]);
const serializedAssets = ref([]);
const showAddLeaseDialog = ref(false);
const selectedSerializedAssetId = ref("");
const editingLease = ref(false);
const originalLease = ref({});
const validLease = ref(false);
const showArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const itemToArchive = ref(null);
const itemToActivate = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const leaseSortBy = ref([{ key: "endDate", order: "asc" }]);
const searchQuery = ref("");
const store = useStore();
const startMenu = ref(false);
const endMenu = ref(false);
const startDate = ref(null);
const endDate = ref(null);

const activeLeases = computed(() => {
  return filteredLeases.value.filter((lease) => lease.activeStatus === true);
});

const archivedLeases = computed(() => {
  return filteredLeases.value.filter((lease) => lease.activeStatus === false);
});

const canAdd = computed(() => {
  return store.getters.canAdd;
});

const rules = {
  required: (value) => !!value || "Required.",
  maxNameLength: (value) =>
    value.length <= 40 || "Name cannot exceed 40 characters",
  onlyNumbers: (value) =>
    /^[0-9]{1,3}$/.test(value) || "Must be a number (max 3 digits)",
};

const newLease = ref({
  serializedAssetId: "",
  lessor: "",
  length: "",
  startDate: null,
  endDate: null,
});

// Leases Section

// Retrieve People from Database
const retrieveLeases = async () => {
  try {
    const response = await LeaseServices.getAll();
    leases.value = response.data.map((lease) => ({
      key: lease.leaseId,
      serializedAssetId: lease.serializedAssetId,
      lessor: lease.lessor,
      startDate: lease.startDate,
      endDate: lease.endDate,
      length: lease.length,
      serializedAssetName: lease.serializedAsset.serializedAssetName,
      activeStatus: lease.activeStatus,
    }));
  } catch (error) {
    console.error("Error loading leases:", error);
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

const editLease = async (lease) => {
  newLease.value = {
    key: lease.key,
    serializedAssetId: lease.serializedAssetId,
    lessor: lease.lessor,
    startDate: lease.startDate,
    endDate: lease.endDate,
    length: lease.length,
  };

  startDate.value = new Date(lease.startDate);
  endDate.value = new Date(lease.endDate); // Ensure correct date is set
  editingLease.value = true;

  // Find the serialized asset object that matches the serializedAssetId
  const matchingAsset = serializedAssets.value.find(
    (asset) => asset.key === lease.serializedAssetId
  );

  selectedSerializedAssetId.value = matchingAsset; // Set the full object here

  showAddLeaseDialog.value = true;
  originalLease.value = { ...newLease.value };
};

const saveLease = async () => {
  let formattedStartDate = null;
  if (startDate.value) {
    // Convert local date to UTC before storing
    formattedStartDate = format(new Date(startDate.value), "MMM dd, yyyy");
  }

  let formattedEndDate = null;
  if (endDate.value) {
    // Convert local date to UTC before storing
    formattedEndDate = format(new Date(endDate.value), "MMM dd, yyyy");
  }

  const leaseData = {
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    length: newLease.value.length,
    lessor: newLease.value.lessor,
    serializedAssetId: selectedSerializedAssetId.value.key,
  };

  try {
    let response;
    if (editingLease.value) {
      // Update lease entry
      response = await LeaseServices.update(newLease.value.key, leaseData);
      snackbarText.value = "Lease updated successfully.";
    } else {
      // Create new lease entry
      response = await LeaseServices.create(leaseData);
      snackbarText.value = "Lease added successfully.";
    }
    snackbar.value = true; // Show the snackbar
    retrieveLeases(); // Refresh lease list
  } catch (error) {
    console.error("Error saving Lease:", error);
    message.value = `Error saving Lease: ${error.message || "Unknown error"}`;
  } finally {
    editingLease.value = false;
    showAddLeaseDialog.value = false;
    resetLeaseForm(); // Reset the form fields
  }
};

const archiveLease = async (leaseId) => {
  const archiveData = {
    activeStatus: false, // The new value for the activeStatus field
  };
  try {
    await LeaseServices.update(leaseId, archiveData);
    snackbarText.value = "Lease archived successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of types after successful deletion
    retrieveLeases();
    leases.value = leases.value.filter((c) => c.id !== leaseId);
  } catch (error) {
    console.error(error);
    message.value = "Error archiving lease.";
  }
};

const activateLease = async (leaseId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await LeaseServices.update(leaseId, activateData);
    snackbarText.value = "Lease activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of categories after successful deletion
    retrieveLeases();
    leases.value = leases.value.filter((c) => c.id !== leaseId);
  } catch (error) {
    console.error(error);
    message.value = "Error activating Lease.";
  }
};

function resetLeaseForm() {
  newLease.value = {
    startDate: null,
    endDate: null,
    length: "",
    lessor: "",
  };
  selectedSerializedAssetId.value = "";
  startDate.value = null;
  endDate.value = null;
}

const openAddLeaseDialog = () => {
  resetLeaseForm();
  editingLease.value = false; // Ensure we are in "add" mode
  showAddLeaseDialog.value = true; // Open the dialog
  selectedSerializedAssetId.value = null; // Reset selected asset
};

const closeLeaseDialog = () => {
  resetLeaseForm();
  showAddLeaseDialog.value = false;
  editingLease.value = false;
  selectedSerializedAssetId.value = null; // Reset selected asset
};

const baseLeaseHeaders = ref([
  { title: "Serialized Asset", key: "serializedAssetName" },
  { title: "Lessor", key: "lessor" },
  { title: "Length", key: "length" },
  { title: "Start Date", key: "startDate" },
  { title: "End Date", key: "endDate" },
]);

const activeLeaseHeaders = computed(() => {
  const headers = [...baseLeaseHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedLeaseHeaders = computed(() => {
  const headers = [...baseLeaseHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

const filteredLeases = computed(() => {
  // Filter leases based on search query
  let filteredLeases = leases.value;

  if (searchQuery.value) {
    const lowerCaseQuery = searchQuery.value.toLowerCase();

    filteredLeases = filteredLeases.filter((lease) => {
      // Include leases where the serialized asset name contains the search query
      return lease.serializedAssetName.toLowerCase().includes(lowerCaseQuery);
    });
  }

  return filteredLeases;
});

const scrollToLease = () => {
  const searchLower = searchQuery.value.toLowerCase();
  const matchedLease = filteredLeases.value.find((lease) =>
    lease.serializedAssetName.toLowerCase().includes(searchLower)
  );

  if (matchedLease) {
    const selector = `[data-lease-id="${matchedLease.key}"]`;
    const leaseElement = document.querySelector(selector);
    if (leaseElement) {
      leaseElement.scrollIntoView({ behavior: "smooth" });
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

const highlightedLeases = computed(() => {
  return filteredLeases.value.map((lease) => ({
    ...lease,
    serializedAssetName: highlightText(lease.serializedAssetName),
  }));
});

const hasLeaseChanged = computed(() => {
  const isNewLeaseChanged = Object.keys(newLease.value).some(
    (key) => newLease.value[key] !== originalLease.value[key]
  );

  const isSerializedAssetChanged =
    selectedSerializedAssetId.value.key !==
    originalLease.value.serializedAssetId;
  const isStartDateChanged = startDate.value
    ? format(new Date(startDate.value), "yyyy-MM-dd") !==
      format(new Date(originalLease.value.startDate), "yyyy-MM-dd")
    : false;
  const isEndDateChanged = endDate.value
    ? format(new Date(endDate.value), "yyyy-MM-dd") !==
      format(new Date(originalLease.value.endDate), "yyyy-MM-dd")
    : false;

  return (
    isNewLeaseChanged ||
    isSerializedAssetChanged ||
    isStartDateChanged ||
    isEndDateChanged
  );
});

// Misc Section

const formatDate = (dateString) => {
  return moment.utc(dateString).format("MMM DD, YYYY");
};

const formatLength = (length) => {
  if (!length) return "N/A"; // Handle cases where length might be undefined or null
  return `${length} mo.`;
};

const openArchiveDialog = (item) => {
  itemToArchive.value = item;
  showArchiveDialog.value = true;
};

const confirmArchive = async () => {
  await archiveLease(itemToArchive.value.id);

  showArchiveDialog.value = false;
  itemToArchive.value = null; // Reset after deletion
};

const openActivateDialog = (item) => {
  itemToActivate.value = item;
  showActivateDialog.value = true;
};

const confirmActivate = async () => {
  await activateLease(itemToActivate.value.id);
  showActivateDialog.value = false;
  itemToActivate.value = null; // Reset after deletion
};

// Computed property for display
const formattedStartDate = computed(() => {
  if (startDate.value) {
    // Display the date in a readable format
    return moment.utc(startDate.value).format("MMM DD, YYYY");
  }
  return "";
});

// Computed property for display
const formattedEndDate = computed(() => {
  if (endDate.value) {
    // Display the date in a readable format
    return moment.utc(endDate.value).format("MMM DD, YYYY");
  }
  return "";
});

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrieveLeases();
  await retrieveSerializedAssets();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Leases </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-row>
          <v-col cols="12">
            <v-tabs v-model="selectedTab" background-color="primary" dark dense>
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
        </v-row>

        <!-- Right align the search filter by using offset -->
        <v-col cols="12" md="8" offset-md="0">
          <v-text-field
            v-model="searchQuery"
            label="Search By Serialized Asset"
            variant="outlined"
            prepend-icon="mdi-cellphone-settings"
            dense
            clearable
            @input="scrollToLease"
            class="pt-0"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Active leases -->
            <div v-if="selectedTab === 'Active'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active Leases</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="openAddLeaseDialog()"
                    >
                      Add Lease
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="activeLeaseHeaders"
                    :items="highlightedLeases"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="leaseSortBy"
                  >
                    <template v-slot:item.serializedAssetName="{ item }">
                      <span v-html="item.serializedAssetName"></span>
                    </template>
                    <template v-slot:item.length="{ item }">
                      <td>{{ formatLength(item.length) }}</td>
                    </template>
                    <template v-slot:item.startDate="{ item }">
                      <td>{{ formatDate(item.startDate) }}</td>
                    </template>
                    <template v-slot:item.endDate="{ item }">
                      <td>{{ formatDate(item.endDate) }}</td>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editLease(item)">
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

            <!-- Archived leases -->
            <div v-if="selectedTab === 'Archived'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Archived Leases</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedLeaseHeaders"
                    :items="archivedLeases"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="leaseSortBy"
                  >
                    <template v-slot:item.length="{ item }">
                      <td>{{ formatLength(item.length) }}</td>
                    </template>
                    <template v-slot:item.startDate="{ item }">
                      <td>{{ formatDate(item.startDate) }}</td>
                    </template>
                    <template v-slot:item.endDate="{ item }">
                      <td>{{ formatDate(item.endDate) }}</td>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editLease(item)">
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
    </v-container>

    <!-- Add/Edit Lease Dialog -->
    <v-dialog v-model="showAddLeaseDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline"
            >{{ editingLease ? "Edit" : "Add" }} Lease
          </span>
        </v-card-title>
        <v-card-text>
          <v-form ref="formPerson" v-model="validLease">
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
                    label="Lessor"
                    variant="outlined"
                    prepend-icon="mdi-account"
                    v-model="newLease.lessor"
                    :rules="[rules.required, rules.maxNameLength]"
                    maxlength="40"
                    counter
                  ></v-text-field>
                </v-col>

                <!-- Start Date Picker -->
                <v-col cols="12">
                  <v-menu
                    v-model="startMenu"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ attrs }">
                      <v-text-field
                        v-model="formattedStartDate"
                        label="Start Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="startMenu = !startMenu"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="startDate"
                      @input="startMenu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>

                <!-- Lease Length Field -->
                <v-col cols="12">
                  <v-text-field
                    label="Length (months)"
                    variant="outlined"
                    prepend-icon="mdi-clock"
                    v-model="newLease.length"
                    :rules="[rules.required, rules.onlyNumbers]"
                    maxlength="3"
                    counter
                  ></v-text-field>
                </v-col>

                <!-- End Date Picker -->
                <v-col cols="12">
                  <v-menu
                    v-model="endMenu"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ attrs }">
                      <v-text-field
                        v-model="formattedEndDate"
                        label="End Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="endMenu = !endMenu"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="endDate"
                      @input="endMenu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>

                <v-col cols="12"> </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="closeLeaseDialog"
            >Cancel</v-btn
          >
          <!-- Temporarily removed the disabled for hasLeaseChanged -->
          <v-btn color="saveblue" @click="saveLease" :disabled="!validLease"
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
        <v-card-text
          >Are you sure you want to archive this item? This action can be undone
          later.
        </v-card-text>
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
          >Confirm Activation</v-card-title
        >
        <v-card-text
          >Are you sure you want to activate this lease? Remember to edit the
          date if this lease is being renewed.
        </v-card-text>
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
