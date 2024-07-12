<script setup>
import WarrantyServices from "../services/warrantyServices";
import SerializedAssetServices from "../services/serializedAssetServices";
import { ref, onMounted, watch, computed } from "vue";
import { useStore } from "vuex";
import { format } from "date-fns";
import moment from "moment-timezone";

const message = ref("");
const selectedTab = ref("Active");
const warranties = ref([]);
const serializedAssets = ref([]);
const showAddWarrantyDialog = ref(false);
const selectedSerializedAssetId = ref("");
const editingWarranty = ref(false);
const originalWarranty = ref({});
const validWarranty = ref(false);
const showArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const itemToArchive = ref(null);
const itemToActivate = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const warrantySortBy = ref([{ key: "serviceDate", order: "desc" }]);
const searchQuery = ref("");
const store = useStore();
const startMenu = ref(false);
const endMenu = ref(false);
const startDate = ref(null);
const endDate = ref(null);

const activeWarranties = computed(() => {
  return filteredWarranties.value.filter(
    (warranty) => warranty.activeStatus === true
  );
});

const archivedWarranties = computed(() => {
  return filteredWarranties.value.filter(
    (warranty) => warranty.activeStatus === false
  );
});

const canAdd = computed(() => {
  return store.getters.canAdd;
});
const rules = {
  required: (value) => !!value || "Required.",
  maxNameLength: (value) =>
    value.length <= 40 || "Description cannot exceed 40 characters",
  onlyNumbers: (value) =>
    /^[0-9]{1,3}$/.test(value) || "Must be a number (max 3 digits)",
};
const newWarranty = ref({
  serializedAssetId: "",
  warrantyDescription: "",
  warrantyNotes: "",
  length: "",
  startDate: null,
  endDate: null,
});

// Warranties Section

// Retrieve People from Database
const retrieveWarranties = async () => {
  try {
    const response = await WarrantyServices.getAll();
    warranties.value = response.data.map((warranty) => ({
      key: warranty.warrantyId,
      serializedAssetId: warranty.serializedAssetId,
      warrantyDescription: warranty.warrantyDescription,
      warrantyNotes: warranty.warrantyNotes,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      length: warranty.length,
      serializedAssetName: warranty.serializedAsset.serializedAssetName,
      activeStatus: warranty.activeStatus,
    }));
  } catch (error) {
    console.error("Error loading Warranties:", error);
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

const editWarranty = async (warranty) => {
  newWarranty.value = {
    key: warranty.key,
    serializedAssetId: warranty.serializedAssetId,
    warrantyDescription: warranty.warrantyDescription,
    warrantyNotes: warranty.warrantyNotes,
    startDate: warranty.startDate,
    endDate: warranty.endDate,
    length: warranty.length,
  };

  startDate.value = new Date(warranty.startDate);
  endDate.value = new Date(warranty.endDate);
  editingWarranty.value = true;

  // Find the serialized asset object that matches the serializedAssetId
  const matchingAsset = serializedAssets.value.find(
    (asset) => asset.key === warranty.serializedAssetId
  );

  selectedSerializedAssetId.value = matchingAsset; // Set the full object here

  showAddWarrantyDialog.value = true;
  originalWarranty.value = { ...newWarranty.value };
};

function monthDiff(d1, d2) {
  var months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
}

const saveWarranty = async () => {
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

  let lengthMonth = monthDiff(
    new Date(startDate.value),
    new Date(endDate.value)
  );

  const warrantyData = {
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    length: lengthMonth,
    warrantyDescription: newWarranty.value.warrantyDescription,
    serializedAssetId: selectedSerializedAssetId.value.key,
    warrantyNotes: newWarranty.value.warrantyNotes,
  };

  try {
    let response;
    if (editingWarranty.value) {
      // Update warranty entry
      response = await WarrantyServices.update(
        newWarranty.value.key,
        warrantyData
      );
      snackbarText.value = "Warranty updated successfully.";
    } else {
      // Create new warranty entry
      response = await WarrantyServices.create(warrantyData);
      snackbarText.value = "Warranty added successfully.";
    }
    snackbar.value = true; // Show the snackbar
    retrieveWarranties(); // Refresh warranty list
  } catch (error) {
    console.error("Error saving Warranty:", error);
    message.value = `Error saving Warranty: ${
      error.message || "Unknown error"
    }`;
  } finally {
    editingWarranty.value = false;
    showAddWarrantyDialog.value = false;
    resetWarrantyForm(); // Reset the form fields
  }
};

const archiveWarranty = async (warrantyId) => {
  const archiveData = {
    activeStatus: false, // The new value for the activeStatus field
  };
  try {
    await WarrantyServices.update(warrantyId, archiveData);
    snackbarText.value = "Warranty archived successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of types after successful deletion
    retrieveWarranties();
    warranties.value = warranties.value.filter((c) => c.id !== warrantyId);
  } catch (error) {
    console.error(error);
    message.value = "Error archiving warranty.";
  }
};

const activateWarranty = async (warrantyId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await WarrantyServices.update(warrantyId, activateData);
    snackbarText.value = "Warranty activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of categories after successful deletion
    retrieveWarranties();
    warranties.value = warranties.value.filter((c) => c.id !== warrantyId);
  } catch (error) {
    console.error(error);
    message.value = "Error activating Warranty.";
  }
};

function resetWarrantyForm() {
  newWarranty.value = {
    startDate: null,
    endDate: null,
    length: "",
    warrantyDescription: "",
    warrantyNotes: "",
  };
  selectedSerializedAssetId.value = "";
  startDate.value = null;
  endDate.value = null;
}

const openAddWarrantyDialog = () => {
  resetWarrantyForm();
  showAddWarrantyDialog.value = true; // Open the dialog
  editingWarranty.value = false; // Ensure we are in "add" mode
  selectedSerializedAssetId.value = null; // Reset selected asset
};

const closeWarrantyDialog = () => {
  resetWarrantyForm();
  showAddWarrantyDialog.value = false; // Close the dialog
  editingWarranty.value = false;
  selectedSerializedAssetId.value = null; // Reset selected asset
};

const baseWarrantyHeaders = ref([
  { title: "Serialized Asset", key: "serializedAssetName" },
  { title: "Warranty Description", key: "warrantyDescription" },
  { title: "Length", key: "length" },
  { title: "Start Date", key: "startDate" },
  { title: "End Date", key: "endDate" },
]);
const activeWarrantyHeaders = computed(() => {
  const headers = [...baseWarrantyHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedWarrantyHeaders = computed(() => {
  const headers = [...baseWarrantyHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

const filteredWarranties = computed(() => {
  let result = warranties.value;

  if (searchQuery.value) {
    const lowerCaseQuery = searchQuery.value.toLowerCase();

    result = result.filter((warranty) =>
      warranty.serializedAssetName.toLowerCase().includes(lowerCaseQuery)
    );
  }

  return result;
});

const scrollToWarranty = () => {
  const searchLower = searchQuery.value.toLowerCase();

  const matchedWarranty = filteredWarranties.value.find((warranty) =>
    warranty.serializedAssetName.toLowerCase().includes(searchLower)
  );

  if (matchedWarranty) {
    const selector = `[data-warranty-id="${matchedWarranty.key}"]`;
    const warrantyElement = document.querySelector(selector);

    if (warrantyElement) {
      warrantyElement.scrollIntoView({ behavior: "smooth" });
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

const highlightedWarranties = computed(() => {
  return filteredWarranties.value.map((warranty) => ({
    ...warranty,
    serializedAssetName: highlightText(warranty.serializedAssetName),
  }));
});

const hasWarrantyChanged = computed(() => {
  const isNewWarrantyChanged = Object.keys(newWarranty.value).some(
    (key) => newWarranty.value[key] !== originalWarranty.value[key]
  );
  const isSerializedAssetChanged =
    selectedSerializedAssetId.value.key !==
    originalWarranty.value.serializedAssetId;

  return isNewWarrantyChanged || isSerializedAssetChanged;
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
  await archiveWarranty(itemToArchive.value.id);

  showArchiveDialog.value = false;
  itemToArchive.value = null; // Reset after deletion
};

const openActivateDialog = (item) => {
  itemToActivate.value = item;
  showActivateDialog.value = true;
};

const confirmActivate = async () => {
  await activateWarranty(itemToActivate.value.id);
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
  await retrieveWarranties();
  await retrieveSerializedAssets();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Warranties </v-toolbar-title>
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
            @input="scrollToWarranty"
            class="pt-0"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Active warranties -->
            <div v-if="selectedTab === 'Active'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active Warranties</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="openAddWarrantyDialog()"
                    >
                      Add Warranty
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="activeWarrantyHeaders"
                    :items="highlightedWarranties"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="warrantySortBy"
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
                      <v-btn
                        icon
                        class="table-icons"
                        @click="editWarranty(item)"
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

            <!-- Archived warranties -->
            <div v-if="selectedTab === 'Archived'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Archived Warranties</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedWarrantyHeaders"
                    :items="archivedWarranties"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="warrantySortBy"
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
                      <v-btn
                        icon
                        class="table-icons"
                        @click="editWarranty(item)"
                      >
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

    <!-- Add/Edit Warranty Dialog -->
    <v-dialog v-model="showAddWarrantyDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline"
            >{{ editingWarranty ? "Edit" : "Add" }} Warranty
          </span>
        </v-card-title>
        <v-card-text>
          <v-form ref="formPerson" v-model="validWarranty">
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
                    label="Warranty Description"
                    variant="outlined"
                    prepend-icon="mdi-account"
                    v-model="newWarranty.warrantyDescription"
                    :rules="[rules.required, rules.maxNameLength]"
                    maxlength="40"
                    counter
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    label="Warranty Notes"
                    variant="outlined"
                    prepend-icon="mdi-account"
                    v-model="newWarranty.warrantyNotes"
                    maxlength="255"
                    counter
                  ></v-textarea>
                </v-col>

                <!-- Start Date Picker -->
                <v-col cols="12">
                  <v-date-input
                    v-model="startDate"
                    clearable
                    label="Warranty Start Date"
                    variant="outlined"
                    color="blue"
                    :rules="[rules.required]"
                  ></v-date-input>
                </v-col>

                <!-- End Date Picker -->
                <v-col cols="12">
                  <v-date-input
                    v-model="endDate"
                    clearable
                    label="Warranty End Date"
                    variant="outlined"
                    color="blue"
                    :rules="[rules.required]"
                  ></v-date-input>
                </v-col>

                <v-col cols="12"> </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="closeWarrantyDialog"
            >Cancel</v-btn
          >
          <!-- Temporarily removed hasWarrantyChanged from disabled -->
          <v-btn
            color="saveblue"
            @click="saveWarranty"
            :disabled="!validWarranty"
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
          >Are you sure you want to activate this warranty? Remember to edit the
          date if this warranty is being renewed.
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
