<script setup>
import AssetProfileServices from "../services/assetProfileServices";
import SerializedAssetServices from "../services/serializedAssetServices";
import ProfileDataServices from "../services/profileDataServices";
import WarrantyServices from "../services/warrantyServices";
import { ref, onMounted, watch, defineProps, computed } from "vue";
import router from "../router";
import { useStore } from "vuex";
import { vMaska } from "maska";
import { parseISO, format } from "date-fns";
import moment from "moment-timezone";

const message = ref("");
const serializedAssets = ref([]);
const assetProfiles = ref([]);
const selectedStatus = ref("Active");
const selectedProfileId = ref("");
const showAddSerializedAssetDialog = ref(false);
const editingSerializedAsset = ref(false);
const validSerializedAsset = ref(false);
const validSerializedAssetDisposal = ref(false);
const showDeleteConfirmDialog = ref(false);
const showArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const itemToDelete = ref(null);
const itemToArchive = ref(null);
const itemToActivate = ref(null);
const rawAcquisitionDate = ref(null);
const rawDisposalDate = ref(null);
const rawWarrStartDate = ref(null);
const rawWarrEndDate = ref(null);

const disposalValueLabel = ref("Disposal Value"); // Default label
const serialNumberLabel = ref("Serial Number"); // Default label
const snackbar = ref(false);
const snackbarText = ref("");
const store = useStore();
const canAdd = computed(() => {
  return store.getters.canAdd;
});
const rules = {
  required: (value) => !!value || "Required.",
  maxDescLength: (value) => value == null || value.length <= 255,
  validPrice: (value) => {
    return value > 0 || "Enter a valid price"; // Ensure the function returns a value
  },
  serialNumberLength: (value) => {
    return value.length <= 20 || "Serial number too long."; // Returns true or error message
  },
};

// maska options
const options = {
  preProcess: (val) => val.replace(/[$,]/g, ""),
  postProcess: (val) => {
    if (!val) return "";

    const sub = 3 - (val.includes(".") ? val.length - val.indexOf(".") : 0);

    return Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    })
      .format(val)
      .slice(0, sub ? -sub : undefined);
  },
};

const props = defineProps({
  profileId: {
    required: true,
  },
});
function monthDiff(d1, d2) {
  var months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
}
const newSerializedAsset = ref({
  serialNumber: "",
  notes: "",
  purchasePrice: "",
  acquisitionDate: null,
  disposalMethod: "",
  disposalDate: null,
  disposalNotes: "",
  disposalPrice: "",
  warrantyDescription: "",
  warrantyNotes: "",
});

// Profile Section

// Retrieve Buildings from Database
const retrieveAssetsForProfile = async () => {
  try {
    const response = await SerializedAssetServices.getAllForProfile(
      props.profileId
    );

    serializedAssets.value = response.data.map((serializedAsset) => {
      const profile = assetProfiles.value.find(
        (t) => t.key === serializedAsset.profileId
      );
      return {
        ...serializedAsset,
        profileName: profile ? profile.profileName : "Unknown Profile",
        key: serializedAsset.serializedAssetId,
        profileId: serializedAsset.profileId,
      };
    });
  } catch (error) {
    message.value = "Failed to load serializedAssets.";
  }
};

// Edit asset
const editSerializedAsset = (serializedAsset) => {
  // Assign existing assets properties, including its unique identifier
  newSerializedAsset.value = {
    ...serializedAsset,
    id: serializedAsset.serializedAssetId, // Adjust according to how profile IDs are named in your data
  };

  selectedProfileId.value = serializedAsset.profileId;
  editingSerializedAsset.value = true;
  showAddSerializedAssetDialog.value = true;

  // Ensure that the raw acquisition date is correctly formatted for the picker
  //rawAcquisitionDate.value = new Date(serializedAsset.acquisitionDate);
  let targetTime = parseISO(serializedAsset.acquisitionDate);
  let tzDifference = targetTime.getTimezoneOffset();
  rawAcquisitionDate.value = new Date(
    targetTime.getTime() + tzDifference * 60 * 1000
  );
  targetTime = parseISO(serializedAsset.disposalDate);
  tzDifference = targetTime.getTimezoneOffset();
  rawDisposalDate.value = new Date(
    targetTime.getTime() + tzDifference * 60 * 1000
  );
};

// Save asset (add or edit)
const saveSerializedAsset = async () => {
  let formattedAcquisitionDate = null;
  if (rawAcquisitionDate.value) {
    formattedAcquisitionDate = format(
      new Date(rawAcquisitionDate.value),
      "MMM dd, yyyy"
    );
  }
  let formattedWarrStartDate = null;
  if (rawWarrStartDate.value) {
    // Convert local date to UTC before storing
    formattedWarrStartDate = format(
      new Date(rawWarrStartDate.value),
      "MMM dd, yyyy"
    );
  }
  let formattedWarrEndDate = null;
  if (rawWarrEndDate.value) {
    // Convert local date to UTC before storing
    formattedWarrEndDate = format(
      new Date(rawWarrEndDate.value),
      "MMM dd, yyyy"
    );
  }
  let formatteddDisposalDate = null;
  if (rawDisposalDate.value) {
    // Convert local date to UTC before storing
    formattedWarrEndDate = format(
      new Date(rawDisposalDate.value),
      "MMM dd, yyyy"
    );
  }

  const serializedAssetData = {
    serialNumber: newSerializedAsset.value.serialNumber,
    profileId: props.profileId,
    purchasePrice: newSerializedAsset.value.purchasePrice.replace(
      /[^0-9.-]+/g,
      ""
    ),
    acquisitionDate: formattedAcquisitionDate,
    disposalDate: formatteddDisposalDate,
    notes: newSerializedAsset.value.notes,
  };

  try {
    if (editingSerializedAsset.value && newSerializedAsset.value.id) {
      await SerializedAssetServices.update(
        newSerializedAsset.value.id,
        serializedAssetData
      );

      snackbarText.value = "Asset updated successfully.";
    } else {
      await SerializedAssetServices.create(serializedAssetData).then((data) => {
        newSerializedAsset.value.id = data.data.serializedAssetId;
        let lengthMonth = monthDiff(
          new Date(rawWarrStartDate.value),
          new Date(rawWarrEndDate.value)
        );

        let newWarranty = {
          serializedAssetId: newSerializedAsset.value.id,
          startDate: formattedWarrStartDate,
          endDate: formattedWarrEndDate,
          warrantyDescription: newSerializedAsset.value.warrantyDescription,
          length: lengthMonth,
          warrantyNotes: newSerializedAsset.value.warrantyNotes,
        };

        WarrantyServices.create(newWarranty);
        snackbarText.value = "Asset added successfully.";
      });
    }
    snackbar.value = true; // Show the snackbar
    await retrieveAssetsForProfile();
  } catch (error) {
    console.error("Error saving asset:", error);
    message.value = `Error saving asset: ${error.message || "Unknown error"}`;
  } finally {
    resetSerializedAssetForm();
    showAddSerializedAssetDialog.value = false;
  }
};

// Delete asset
const deleteSerializedAsset = async (serializedAssetId) => {
  try {
    await SerializedAssetServices.delete(serializedAssetId);
    snackbarText.value = "Asset deleted successfully.";
    snackbar.value = true; // Show the snackbar
    retrieveAssetsForProfile();
    message.value = "Asset deleted successfully.";
  } catch (error) {
    console.error("Error deleting asset:", error);
    message.value = "Error deleting asset.";
  }
};

// Open dialog to add a new profile
const openAddSerializedAssetDialog = () => {
  // Reset other serialized asset form values
  resetSerializedAssetForm();

  let targetTime1 = parseISO(profileDetails.acquisitionDate);
  let tzDifference1 = targetTime1.getTimezoneOffset();
  const acquisitionDate = new Date(
    targetTime1.getTime() + tzDifference1 * 60 * 1000
  );

  targetTime1 = parseISO(profileDetails.value.warrantyStartDate);
  tzDifference1 = targetTime1.getTimezoneOffset();
  const tempWarrStartDate = new Date(
    targetTime1.getTime() + tzDifference1 * 60 * 1000
  );

  targetTime1 = parseISO(profileDetails.value.warrantyEndDate);
  tzDifference1 = targetTime1.getTimezoneOffset();
  const tempWarrEndDate = new Date(
    targetTime1.getTime() + tzDifference1 * 60 * 1000
  );

  rawAcquisitionDate.value = !isNaN(acquisitionDate.getTime())
    ? acquisitionDate
    : new Date();
  rawWarrStartDate.value = !isNaN(tempWarrStartDate.getTime())
    ? tempWarrStartDate
    : null;
  rawWarrEndDate.value = !isNaN(tempWarrEndDate.getTime())
    ? tempWarrEndDate
    : null;

  // Prefill the purchase price and acquisition date from the profileDetails
  newSerializedAsset.value.purchasePrice =
    profileDetails.value.purchasePrice || "";
  newSerializedAsset.value.warrantyDescription =
    profileDetails.value.warrantyDescription || "";
  newSerializedAsset.value.warrantyNotes =
    profileDetails.value.warrantyNotes || "";

  // Open the dialog
  showAddSerializedAssetDialog.value = true;
};

const closeSerializedAssetDialog = () => {
  resetSerializedAssetForm(); // Resets form when closing or canceling the dialog
  showAddSerializedAssetDialog.value = false;
};

// Reset the profile form to its default state
const resetSerializedAssetForm = () => {
  newSerializedAsset.value = {
    serialNumber: "",
    notes: "",
    acquisitionDate: null,
    warrantyStartDate: null,
    warrEndDateMenu: null,
    purchasePrice: "",
    warrantyDescription: "",
    warrantyNotes: "",
  };
  validSerializedAsset.value = false;
  editingSerializedAsset.value = false;
  rawAcquisitionDate.value = null;
  rawWarrEndDate.value = null;
  rawWarrStartDate.value = null;
  serialNumberLabel.value = "Serial Number"; // Reset label to default
};

// Reset Archive for serializedAsset
const resetSerializedAssetArchive = () => {
  newSerializedAsset.value.disposalDate = null;
  newSerializedAsset.value.disposalMethod = "";
  newSerializedAsset.value.disposalPrice = "";
  newSerializedAsset.value.disposalNotes = "";
  disposalValueLabel.value = "Disposal Value"; // Reset label to default
  validSerializedAssetDisposal.value = false; // Reset validation state if used
  rawDisposalDate.value = null; // Reset the internal date value if used
};

const filterAssetsByProfileId = () => {
  return serializedAssets.value.filter(
    (asset) =>
      String(asset.profileId) === String(props.profileId) &&
      asset.activeStatus === (selectedStatus.value === "Active")
  );
};

const archiveSerializedAsset = async (serializedAssetId) => {
  let formattedDisposalDate = null;
  if (rawDisposalDate.value) {
    // Convert local date to UTC before storing
    formattedDisposalDate = format(
      new Date(rawDisposalDate.value),
      "MMM dd, yyyy"
    );
  }

  let disposalPrice = newSerializedAsset.value.disposalPrice.replace(
    /[^0-9.-]+/g,
    ""
  );
  if (disposalPrice === "") {
    disposalPrice = null; // Treat empty string as null
  }

  const archiveData = {
    activeStatus: false,
    disposalMethod: newSerializedAsset.value.disposalMethod,
    disposalDate: formattedDisposalDate,
    disposalNotes: newSerializedAsset.value.disposalNotes,
    disposalPrice: disposalPrice,
  };
  try {
    await SerializedAssetServices.update(serializedAssetId, archiveData);
    snackbarText.value = "Asset archived successfully.";
    snackbar.value = true;
    resetSerializedAssetArchive();
    retrieveAssetsForProfile();
  } catch (error) {
    console.error("Error archiving asset:", error);
    message.value = "Error archiving asset.";
  }
};

const updateDisposalValueLabel = () => {
  if (newSerializedAsset.value.disposalMethod === "Sold") {
    disposalValueLabel.value = "Sale Price";
  } else {
    disposalValueLabel.value = "Disposal Value";
  }
};

const updateSerialNumberLabel = () => {
  // Check if the selectedProfileId has a valid key and fetch the corresponding profile
  const profile = assetProfiles.value.find(
    (p) => p.key === selectedProfileId.value?.key
  );

  if (profile && (profile.typeId === 13 || profile.typeId === "13")) {
    // Check for both '13' as a string and 13 as a number
    serialNumberLabel.value = "Key Number";
  } else {
    serialNumberLabel.value = "Serial Number";
  }
};

const activateSerializedAsset = async (serializedAssetId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await SerializedAssetServices.update(serializedAssetId, activateData);
    snackbarText.value = "Asset activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of assets after successful deletion
    retrieveAssetsForProfile();
    serializedAssets.value = serializedAssets.value.filter(
      (c) => c.id !== serializedAssetsId
    );
  } catch (error) {
    console.error(error);
    message.value = "Error archiving asset.";
  }
};

const baseSerializedAssetHeaders = ref([
  { title: "Serial Number", key: "serialNumber" },
  { title: "Notes", key: "notes" },
  { title: "Status", key: "checkoutStatus" },
  { title: "View Asset Details", key: "view" },
]);

const serializedAssetHeaders = computed(() => {
  const headers = [...baseSerializedAssetHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedSerializedAssetHeaders = computed(() => {
  const headers = [...baseSerializedAssetHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  if (store.getters.canDelete) {
    headers.push({ title: "Delete", key: "delete", sortable: false });
  }

  return headers;
});

// Misc Section
// const fixProfileField = (profileField) => {
//   if (profileField === profileField.toUpperCase()) {
//     return profileField;
//   }

//   let field = profileField.split(/(?=[A-Z])/);

//   return field
//     .map((field) => field.charAt(0).toUpperCase() + field.slice(1))
//     .join(" ");
// };

const profileDetails = ref({ profileName: "Loading..." });

const retrieveProfileDetails = async () => {
  try {
    const response = await AssetProfileServices.getById(props.profileId);
    profileDetails.value = response.data;
  } catch (error) {
    console.error("Error loading profile details:", error);
    message.value = "Failed to load profile details.";
  }
};

const profileData = ref({ profileName: "Loading..." });

const retrieveProfileData = async () => {
  try {
    const response = await ProfileDataServices.getByProfileId(props.profileId);
    profileData.value = response.data;
  } catch (error) {
    console.error("Error loading profile data:", error);
    message.value = "Failed to load profile data.";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "Indefinite";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY");
};

const formatCurrency = (value) => {
  // Attempt to convert the input value to a number, if it's not already.
  const numericValue = parseFloat(value);

  if (isNaN(numericValue)) return value;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const openDeleteConfirmDialog = (item) => {
  itemToDelete.value = item;
  showDeleteConfirmDialog.value = true;
};

const confirmDelete = async () => {
  if (itemToDelete.value.type === "serializedAsset") {
    await deleteSerializedAsset(itemToDelete.value.id);
    await retrieveAssetsForProfile(); // Refresh the list after deletion
    snackbarText.value = "Asset deleted successfully.";
    snackbar.value = true;
  }
  showDeleteConfirmDialog.value = false;
  itemToDelete.value = null; // Reset after deletion
};

const openArchiveDialog = (item) => {
  itemToArchive.value = item;
  if (item && item.type === "serializedAsset") {
    newSerializedAsset.disposalMethod = item.disposalMethod || "";
    newSerializedAsset.disposalDate = item.disposalDate || null;
    newSerializedAsset.disposalNotes = item.disposalNotes || "";
  } else {
    // Reset or provide default values for safety
    newSerializedAsset.disposalMethod = "";
    newSerializedAsset.disposalDate = null;
    newSerializedAsset.disposalNotes = "";
  }
  showArchiveDialog.value = true;
};

const confirmArchive = async () => {
  if (itemToArchive.value.type === "serializedAsset") {
    await archiveSerializedAsset(itemToArchive.value.id);
    await retrieveAssetsForProfile(); // Refresh the list after archiving
    snackbarText.value = "Asset archived successfully.";
    snackbar.value = true;
  }
  showArchiveDialog.value = false;
  itemToArchive.value = null; // Reset after archiving
};

const openActivateDialog = (item) => {
  itemToActivate.value = item;
  showActivateDialog.value = true;
};

const confirmActivate = async () => {
  if (itemToActivate.value.type === "serializedAsset") {
    await activateSerializedAsset(itemToActivate.value.id);
    await retrieveAssetsForProfile(); // Refresh the list after activation
    snackbarText.value = "Asset activated successfully.";
    snackbar.value = true;
  }
  showActivateDialog.value = false;
  itemToActivate.value = null; // Reset after activation
};

const goBack = () => {
  router.push("/assetManage");
};

const translateStatus = (status) => {
  return status ? "Checked Out" : "Available";
};

function viewSerializedAsset(serializedAssetId) {
  const sourcePage = "profileView";
  router.push({
    name: "serializedAssetView",
    params: { serializedAssetId: serializedAssetId },
    query: { sourcePage: sourcePage },
  });
}

// Computed property for display
const formattedAcquisitionDate = computed(() => {
  if (rawAcquisitionDate.value) {
    // Display the date in a readable format
    return moment.utc(rawAcquisitionDate.value).format("MMM DD, YYYY");
  }
  return "";
});

const formattedWarrStartDate = computed(() => {
  if (rawWarrStartDate.value) {
    // Display the date in a readable format
    return moment.utc(rawWarrStartDate.value).format("MMM DD, YYYY");
  }
  return "";
});

const formattedWarrEndDate = computed(() => {
  if (rawWarrEndDate.value) {
    // Display the date in a readable format
    return moment.utc(rawWarrEndDate.value).format("MMM DD, YYYY");
  }
  return "";
});

// Computed property for display
const formattedDisposalDate = computed(() => {
  if (rawDisposalDate.value) {
    // Display the date in a readable format
    return moment.utc(rawDisposalDate.value).format("MMM DD, YYYY");
  }
  return "";
});

// Watcher to update the profile selection when adding a new serialized asset
// Could not get the @change or @input to work for the v-auto, so I had to do this

// Watcher for disposal method on serializedAsset archive
watch(
  () => newSerializedAsset.value.disposalMethod,
  (newVal, oldVal) => {
    updateDisposalValueLabel();
  }
);

// Watcher for profile on serializedAsset add/edit
watch(
  () => selectedProfileId.value,
  () => {
    updateSerialNumberLabel();
  },
  { deep: true }
);

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrieveProfileDetails();
  await retrieveProfileData();
  await retrieveAssetsForProfile();
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
              "Profile for " + profileDetails.profileName
            }}</v-toolbar-title>
          </v-toolbar>
          <v-divider class="my-4"></v-divider>

          <!-- Purchase Price and Acquisition Date -->
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <div class="asset-detail">
                <strong>Purchase Price</strong>
                <div>{{ formatCurrency(profileDetails.purchasePrice) }}</div>
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <div class="asset-detail">
                <strong>Acquisition Date</strong>
                <div>
                  {{ formatDate(profileDetails.acquisitionDate) || "N/A" }}
                </div>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <div class="asset-detail">
                <strong>Features</strong>
                <div>
                  <v-textarea
                    v-model="profileDetails.features"
                    rows="1"
                    variant="filled"
                    auto-grow
                    bg-color="background"
                    base-color="background"
                    readonly
                    flat
                  ></v-textarea>
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <div class="asset-detail">
                <strong>Accessories</strong>
                <v-textarea
                  readonly
                  v-model="profileDetails.accessories"
                  rows="1"
                  variant="filled"
                  auto-grow
                  bg-color="background"
                  base-color="background"
                  flat
                ></v-textarea>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <div class="asset-detail">
                <strong>Warranty Desc</strong>
                <div>{{ profileDetails.warrantyDescription || "N/A" }}</div>
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <div class="asset-detail">
                <strong>Warranty Start Date</strong>
                <div>
                  {{ formatDate(profileDetails.warrantyStartDate) || "N/A" }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <div class="asset-detail">
                <strong>Warranty End Date</strong>
                <div>
                  {{ formatDate(profileDetails.warrantyEndDate) || "N/A" }}
                </div>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <!-- Notes Section -->
            <v-col cols="12" sm="6" md="4">
              <div class="notes-section">
                <strong>Notes</strong>
                <div class="notes-data">
                  {{ profileDetails.notes || "No notes available" }}
                </div>
              </div>
            </v-col>
          </v-row>

          <!-- Profile Details Section -->
          <v-row>
            <v-col
              v-for="(profile, index) in profileData"
              :key="index"
              cols="12"
              sm="6"
              md="4"
            >
              <div class="profile-detail">
                <div class="profile-field">{{ profile.field }}</div>
                <div class="profile-data">{{ profile.data }}</div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <v-toolbar color="background">
            <v-toolbar-title>{{
              "Assets for " + profileDetails.profileName
            }}</v-toolbar-title>
          </v-toolbar>
          <v-divider class="my-4"></v-divider>

          <!-- Assets Section -->
          <v-tabs v-model="selectedStatus" background-color="primary" dark>
            <v-tab color="primary" value="Active">Active</v-tab>
            <v-tab color="primary" value="Archived">Archived</v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Active asset for profile Section -->
            <div v-if="selectedStatus === 'Active'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active {{ profileDetails.profileName }}</span>
                  <template v-if="canAdd && profileDetails.activeStatus">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="openAddSerializedAssetDialog"
                    >
                      Add New {{ profileDetails.profileName }}
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="serializedAssetHeaders"
                    :items="filterAssetsByProfileId()"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
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
                    <template v-slot:item.checkoutStatus="{ item }">
                      <td>{{ translateStatus(item.checkoutStatus) }}</td>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="editSerializedAsset(item)"
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
                            type: 'serializedAsset',
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

            <!-- Archived Asset for profile Section -->
            <div v-if="selectedStatus === 'Archived'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active {{ profileDetails.profileName }}'s</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedSerializedAssetHeaders"
                    :items="filterAssetsByProfileId()"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
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
                    <template v-slot:item.checkoutStatus="{ item }">
                      <td>{{ translateStatus(item.checkoutStatus) }}</td>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="editSerializedAsset(item)"
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
                            type: 'serializedAsset',
                          })
                        "
                      >
                        <v-icon>mdi-arrow-up-box</v-icon>
                      </v-btn>
                    </template>
                    <template v-slot:item.delete="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="
                          openDeleteConfirmDialog({
                            id: item.key,
                            type: 'serializedAsset',
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

    <!-- Add/Edit serializedAsset Dialog -->
    <v-dialog v-model="showAddSerializedAssetDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title>
          <span class="headline"
            >{{ editingSerializedAsset ? "Edit" : "Add" }}
            {{ profileDetails.profileName }}</span
          >
        </v-card-title>
        <v-card-text>
          <v-form ref="formSerializedAsset" v-model="validSerializedAsset">
            <v-container id="attach">
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    :label="serialNumberLabel"
                    variant="outlined"
                    v-model="newSerializedAsset.serialNumber"
                    :rules="[rules.required, rules.serialNumberLength]"
                    maxlength="20"
                    :counter="20"
                    prepend-icon="mdi-pound"
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    label="Purchase Price"
                    variant="outlined"
                    v-model="newSerializedAsset.purchasePrice"
                    :rules="[rules.required]"
                    maxlength="12"
                    v-maska:[options]
                    data-maska="0.99"
                    data-maska-tokens="0:\d:multiple|9:\d:optional"
                    inputmode="numeric"
                    type="text"
                    prepend-icon="mdi-cash-multiple"
                  ></v-text-field>
                </v-col>
                <v-col
                  cols="6"
                  v-if="
                    editingSerializedAsset && !newSerializedAsset.activeStatus
                  "
                >
                  <v-date-input
                    v-model="rawDisposalDate"
                    clearable
                    label="Disposal Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  ></v-date-input>
                </v-col>
                <v-col cols="6">
                  <v-date-input
                    v-model="rawAcquisitionDate"
                    clearable
                    label="Acquisition Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  ></v-date-input>
                </v-col>

                <v-col cols="12" v-if="!editingSerializedAsset">
                  <v-text-field
                    label="Warranty Description"
                    variant="outlined"
                    v-model="newSerializedAsset.warrantyDescription"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" v-if="!editingSerializedAsset">
                  <v-text-field
                    label="Warranty Notes"
                    variant="outlined"
                    v-model="newSerializedAsset.warrantyNotes"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-text-field>
                </v-col>
                <v-col cols="6" v-if="!editingSerializedAsset">
                  <v-date-input
                    v-model="rawWarrStartDate"
                    clearable
                    label="Warranty Start Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  ></v-date-input>
                </v-col>
                <v-col cols="6" v-if="!editingSerializedAsset">
                  <v-date-input
                    v-model="rawWarrEndDate"
                    clearable
                    label="Warranty End Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  ></v-date-input>
                </v-col>

                <v-col cols="12">
                  <v-textarea
                    label="Notes"
                    variant="outlined"
                    v-model="newSerializedAsset.notes"
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
          <v-btn color="cancelgrey" text @click="closeSerializedAssetDialog"
            >Cancel</v-btn
          >
          <v-btn
            color="saveblue"
            @click="saveSerializedAsset"
            :disabled="!validSerializedAsset"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Archive Dialog -->
    <!-- <v-dialog v-model="showArchiveDialog" max-width="500px">
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
    </v-dialog> -->

    <!-- Confirm Archive Dialog -->
    <v-dialog v-model="showArchiveDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title>Confirm Archive</v-card-title>
        <v-card-text>
          <v-form
            ref="formSerializedAssetDisposal"
            v-model="validSerializedAssetDisposal"
          >
            <v-container id="attachDisposal">
              <v-row>
                <v-col>
                  <v-date-input
                    v-model="rawDisposalDate"
                    clearable
                    label="Disposal Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  ></v-date-input>
                </v-col>

                <v-col cols="12">
                  <!-- Disposal Method Selection -->
                  <v-select
                    v-model="newSerializedAsset.disposalMethod"
                    :items="[
                      'Sold',
                      'Scrapped',
                      'Donated',
                      'Recycled',
                      'Other',
                    ]"
                    label="Disposal Method"
                    variant="outlined"
                    dense
                    prepend-icon="mdi-recycle"
                    :rules="[rules.required]"
                    @change="updateDisposalValueLabel"
                  ></v-select>
                </v-col>

                <v-col cols="12">
                  <!-- Disposal Value or Sale Price Field -->
                  <v-text-field
                    :label="disposalValueLabel"
                    hint="Enter the price at which the asset was disposed of, if applicable."
                    variant="outlined"
                    v-model="newSerializedAsset.disposalPrice"
                    maxlength="12"
                    v-maska:[options]
                    data-maska="0.99"
                    data-maska-tokens="0:\d:multiple|9:\d:optional"
                    inputmode="numeric"
                    type="text"
                    prepend-icon="mdi-cash-multiple"
                  ></v-text-field>
                </v-col>

                <v-col cols="12">
                  <v-textarea
                    label="Disposal Notes"
                    variant="outlined"
                    v-model="newSerializedAsset.disposalNotes"
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
          <v-btn
            color="cancelgrey"
            text
            @click="
              resetSerializedAssetArchive();
              showArchiveDialog = false;
            "
          >
            Cancel
          </v-btn>
          <v-btn
            color="saveblue"
            text
            @click="confirmArchive"
            :disabled="!validSerializedAssetDisposal"
            >Archive</v-btn
          >
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

    <!-- Confirm Delete Dialog -->
    <v-dialog v-model="showDeleteConfirmDialog" max-width="500px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Confirm Deletion</v-card-title
        >
        <v-card-text>Are you sure you want to delete this item?</v-card-text>
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

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
