<script setup>
import AssetCategoryServices from "../services/assetCategoryServices";
import AssetTypeServices from "../services/assetTypeServices";
import AssetProfileServices from "../services/assetProfileServices";
import SerializedAssetServices from "../services/serializedAssetServices";
import UserRoleServices from "../services/userRoleServices";
import WarrantyServices from "../services/warrantyServices";
import BarcodeServices from "../services/barcodeServices";
import logServices from "../services/logServices";
import SearchAssets from "../components/SearchAssets.vue";
import ProfileDialog from "../components/ProfileDialog.vue";
import EditType from "../components/EditType.vue";
import { ref, onMounted, watch, computed, toRaw } from "vue";
import router from "../router";
import { useStore } from "vuex";
import { vMaska } from "maska";
import { format, max } from "date-fns";
import { parseISO } from "date-fns";

const userRole = ref({});
const message = ref("");
const selectedProfile = ref(""); // this is to be sent as a prop to DynamicTextField
const selectedTab = ref("SerializedAssets");
const selectedStatus = ref("Active");
const assetCategories = ref([]);

const assetTypes = ref([]);
const activeAssetTypes = ref([]);
const assetProfiles = ref([]);
const searchProfile = ref("");
const activeAssetProfiles = ref([]);
const showAddTypeDialog = ref(false);
const showAddProfileDialog = ref(false);
const showAddSerializedAssetDialog = ref(false);
const editingType = ref(false);
const editingSerializedAsset = ref(false);
const originalType = ref({});
const originalSerializedAsset = ref({});
const selectedCategoryId = ref("");
const selectedFilterCategoryId = ref("");
const selectedTypeId = ref("");
const selectedFilterTypeId = ref("");
const selectedProfileId = ref("");
const selectedFilterProfileId = ref("");
const validType = ref(false);
const validProfile = ref(false);
const validSerializedAsset = ref(false);
const showArchiveDialog = ref(false);
const showSerialArchiveDialog = ref(false);
const showCannotArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const itemToArchive = ref(null);
const itemToActivate = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const categoriesSortBy = ref([{ key: "title", order: "asc" }]);
const typesSortBy = ref([{ key: "title", order: "asc" }]);
const profilesSortBy = ref([{ key: "profileName", order: "asc" }]);
const rawAcquisitionDate = ref(null);
const rawWarrStartDate = ref(null);
const rawWarrEndDate = ref(null);
const disposalValueLabel = ref("Disposal Value"); // Default label
const serialNumberLabel = ref("Serial Number"); // Default label
const barcodes = ref([]);
const originalBarcodes = ref([]);
const deletedBarcodes = ref([]);
const store = useStore();
const originalProfileId = ref(""); // Stores the original profile ID when editing an asset
const assetMaintenanceDate = ref(null);
const assetMaintenanceDesc = ref("");
const showAssetWarranty = ref(false);
const showAssetMaintenance = ref(false);
const dataLoaded = ref(false);
const canAdd = computed(() => {
  return store.getters.canAdd;
});
const userRoleId = computed(() => {
  return store.getters.getUserRole;
});
const userRoleCategoryId = computed(() => {
  return userRole.value.data.categoryId;
});
const getUserRole = async () => {
  userRole.value = await UserRoleServices.get(userRoleId.value);
  return userRole.value;
};

const rules = {
  required: (value) => !!value || "Required.",
  maxDescLength: (value) => value === null || value.length <= 255,
  maxNameLength: (value) => value === null || value.length <= 50,
  maxNotesLength: (value) => value === null || value.length <= 255,
  serialNumberLength: (value) => value === null || value.length <= 20,
  purchasePrice: (value) =>
    value === null || value === "" || !isNaN(value) || "Invalid price.",
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

const newType = ref({
  title: "",
  desc: "",
  categoryId: "",
  customFields: [],
});

const newProfile = ref({
  profileName: "",
  notes: "",
  typeId: "",
});

const newSerializedAsset = ref({
  serialNumber: "",
  notes: "",
  profileId: "",
  purchasePrice: "",
  acquisitionDate: null,
  disposalMethod: "",
  disposalDate: null,
  disposalNotes: "",
  disposalPrice: "",
});

// *** Categories Section ***

// Retrieve Categories from Database
const retrieveAssetCategories = async () => {
  const categoriesResponse = ref([]);

  try {
    if (userRole.value.data.categoryId === 4) {
      const response = await AssetCategoryServices.getAll();
      if (response && response.data) {
        categoriesResponse.value = response.data;
      } else {
        throw new Error("Invalid response structure");
      }
    } else {
      const response =
        await AssetCategoryServices.getAssetCategoriesByCategoryId(
          userRole.value.data.categoryId
        );
      if (response && response.data) {
        categoriesResponse.value = response.data;
      } else {
        throw new Error("Invalid response structure");
      }
    }

    if (Array.isArray(categoriesResponse.value)) {
      const enrichedCategories = categoriesResponse.value.map((category) => ({
        ...category,
        title: category.categoryName,
        key: category.categoryId,
        activeStatus: category.activeStatus,
      }));
      assetCategories.value = enrichedCategories;
      assetCategories.value.sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName)
      );
    } else {
      throw new Error("Data is not an array");
    }
  } catch (error) {
    console.error("Error loading categories:", error);
    message.value = "Failed to load categories.";
  }
};

const baseCategoryHeaders = ref([
  { title: "Category Name", key: "title" },
  { title: "Description", key: "desc", sortable: false },
]);

// *** Asset Types Section ***

// Retrieve Types from Database
const retrieveAssetTypes = async () => {
  const typesResponse = ref([]);

  try {
    if (userRole.value.data.categoryId === 4) {
      const response = await AssetTypeServices.getAll();
      if (response && response.data) {
        typesResponse.value = response.data;
      } else {
        throw new Error("Invalid response structure");
      }
    } else {
      const response = await AssetTypeServices.getAssetTypesByCategoryId(
        userRole.value.data.categoryId
      );
      if (response && response.data) {
        typesResponse.value = response.data;
      } else {
        throw new Error("Invalid response structure");
      }
    }

    if (Array.isArray(typesResponse.value)) {
      const enrichedTypes = typesResponse.value.map((type) => {
        const category = assetCategories.value.find(
          (c) => c.key === type.categoryId
        );
        return {
          ...type,
          categoryName: category ? category.title : "Unknown Category",
          key: type.typeId,
          title: type.typeName,
          categoryId: type.categoryId,
          activeStatus: type.activeStatus,
        };
      });
      assetTypes.value = enrichedTypes;
      assetTypes.value.sort((a, b) => a.typeName.localeCompare(b.typeName));
      activeAssetTypes.value = assetTypes.value.filter(
        (type) => type.activeStatus === true
      );
    } else {
      throw new Error("Data is not an array");
    }
  } catch (error) {
    console.error("Error loading types:", error);
    message.value = "Failed to load types.";
  }
};

const editType = (type) => {
  newType.value = {
    title: type.title,
    desc: type.desc,
    categoryId: type.categoryId,
    typeId: type.typeId,
  };
  editingType.value = true;
  showAddTypeDialog.value = true;
};

const saveType = async () => {
  retrieveAssetTypes();
  showAddTypeDialog.value = false;
};

const resetForm = () => {
  newType.value = {
    title: "",
    desc: "",
    categoryId: "",
    id: null,
    customFields: [],
  }; // Explicitly set `id` to `null`
  selectedCategoryId.value = "";
  validType.value = false;
  editingType.value = false; // Explicitly reset editing flag
};

const closeTypeDialog = () => {
  resetForm(); // Resets form when closing or canceling the dialog
  showAddTypeDialog.value = false;
  originalType.value = {}; // Reset original values
};

const openAddTypeDialog = () => {
  resetForm(); // Ensure form is reset when dialog is opened

  showAddTypeDialog.value = true;
};

const filteredAssetTypes = computed(() => {
  return assetTypes.value.filter((type) => {
    // Filter by active status
    let statusMatch = true;
    if (selectedStatus.value === "Active") {
      statusMatch = type.activeStatus === true;
    } else if (selectedStatus.value === "Archived") {
      statusMatch = type.activeStatus === false;
    }

    // Filter by selected category (from v-autocomplete)
    let categoryMatch = true;
    if (selectedFilterCategoryId.value) {
      // Check if selectedFilterCategoryId is not null before accessing its key
      categoryMatch =
        type.categoryId ===
        (selectedFilterCategoryId.value
          ? selectedFilterCategoryId.value.key
          : null);
    }

    // Filter by selected type (from v-autocomplete)
    let typeMatch = true;
    if (selectedFilterTypeId.value) {
      // Check if selectedFilterTypeId is not null before accessing its key
      typeMatch =
        type.key ===
        (selectedFilterTypeId.value ? selectedFilterTypeId.value.key : null);
    }

    // Return types that match all the above criteria
    return statusMatch && categoryMatch && typeMatch;
  });
});

const onCategoryClear = () => {
  selectedFilterCategoryId.value = null;
  selectedFilterTypeId.value = null; // Also clear the selected type
  selectedFilterProfileId.value = null; // Also clear the selected profile
};

const onTypeClear = () => {
  selectedFilterTypeId.value = null; // Clear the selected type
  selectedFilterProfileId.value = null; // Also clear the selected profile
};

const archiveType = async (typeId) => {
  const archiveData = {
    activeStatus: false, // The new value for the activeStatus field
  };
  try {
    await AssetTypeServices.update(typeId, archiveData);
    snackbarText.value = "Type archived successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of types after successful deletion
    retrieveAssetTypes();
    assetTypes.value = assetTypes.value.filter((c) => c.id !== typeId);
  } catch (error) {
    console.error(error);
    message.value = "Error archiving type.";
  }
};

const activateType = async (typeId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await AssetTypeServices.update(typeId, activateData);
    snackbarText.value = "Type activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of categories after successful deletion
    retrieveAssetTypes();
    assetTypes.value = assetTypes.value.filter((c) => c.id !== typeId);
  } catch (error) {
    console.error(error);
    message.value = "Error activating type.";
  }
};

const baseTypeHeaders = ref([
  { title: "Type Name", key: "title" },
  { title: "Description", key: "desc", sortable: false },
  { title: "Category", key: "categoryName" },
]);

const activeTypeHeaders = computed(() => {
  const headers = [...baseTypeHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedTypeHeaders = computed(() => {
  const headers = [...baseTypeHeaders.value];

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

// *** Profiles Section ***

// Retrieve Profiles from Database
const retrieveAssetProfiles = async () => {
  const profilesResponse = ref([]);

  try {
    let response;
    // Hypothetical condition based on user role or other attribute
    if (userRole.value.data.categoryId === 4) {
      response = await AssetProfileServices.getAll(); // Method to get all profiles
    } else {
      response = await AssetProfileServices.getProfilesByCategoryId(
        userRole.value.data.categoryId
      ); // Hypothetical method to get profiles by category
    }

    if (response && response.data) {
      profilesResponse.value = response.data;
    } else {
      throw new Error("Invalid response structure");
    }

    // Fetching serialized assets data
    const serializedAssetsResponse = await SerializedAssetServices.getAll();
    if (serializedAssetsResponse && serializedAssetsResponse.data) {
      const serializedAssetsData = serializedAssetsResponse.data;

      if (Array.isArray(profilesResponse.value)) {
        const enrichedProfiles = profilesResponse.value.map((profile) => {
          const type = assetTypes.value.find((t) => t.key === profile.typeId);
          const assetsCount = serializedAssetsData.filter(
            (asset) => asset.profileId === profile.profileId
          ).length;
          return {
            ...profile,
            typeName: type ? type.title : "Unknown Type",
            key: profile.profileId,
            title: profile.profileName,
            assetsCount: assetsCount,
            activeStatus: profile.activeStatus,
          };
        });
        assetProfiles.value = enrichedProfiles;
        assetProfiles.value.sort((a, b) =>
          a.profileName.localeCompare(b.profileName)
        );
        activeAssetProfiles.value = assetProfiles.value.filter(
          (profile) => profile.activeStatus === true
        );
      } else {
        throw new Error("Data is not an array");
      }
    } else {
      throw new Error("Failed to fetch serialized assets data");
    }
  } catch (error) {
    console.error("Error loading profiles:", error);
    message.value = "Failed to load profiles.";
  }
  finally {
    dataLoaded.value = true;
  }
};

const filteredTypesForProfileAutocomplete = computed(() => {
  if (selectedFilterCategoryId.value) {
    return assetTypes.value.filter(
      (type) => type.categoryId === selectedFilterCategoryId.value.key
    );
  } else {
    return assetTypes.value;
  }
});

// Open dialog to add a new profile
const openAddProfileDialog = () => {
  resetProfileForm();
  showAddProfileDialog.value = true;
};

const handleCloseProfileDialog = async () => {
  resetProfileForm();
  showAddProfileDialog.value = false;
  await retrieveAssetProfiles();
};

const handleUpdatedProfile = () => {
  snackbarText.value = "Profile updated successfully.";
  snackbar.value = true;
};

const handleSavedProfile = () => {
  snackbarText.value = "Profile added successfully.";
  snackbar.value = true;
};

// Reset the profile form to its default state
const resetProfileForm = () => {
  newProfile.value = {
    profileName: "",
    notes: "",
    purchasePrice: "",
    acquisitionDate: null,
    warrantyStartDate: null,
    warrantyEndDate: null,
    warrantyDescription: "",
    warrantyNotes: "",
    typeId: "",
    dynamicFields: [],
  };
  selectedTypeId.value = "";
  validProfile.value = false;
  selectedProfile.value = "";
};

// Edit profile
const sendEditProfile = (profile) => {
  selectedProfile.value = profile;
  selectedTypeId.value = profile.typeId;
  showAddProfileDialog.value = true;
};

function viewProfile(profileId) {
  router.push({ name: "profileView", params: { profileId: profileId } });
}

const filteredAssetProfiles = computed(() => {
  return assetProfiles.value.filter((profile) => {
    let statusMatch =
      selectedStatus.value === "Active"
        ? profile.activeStatus
        : !profile.activeStatus;

    let typeMatch = true;
    if (selectedFilterTypeId.value) {
      typeMatch = profile.typeId === selectedFilterTypeId.value.key;
    }

    let categoryMatch = true;
    if (selectedFilterCategoryId.value) {
      const type = assetTypes.value.find((t) => t.key === profile.typeId);
      categoryMatch =
        type && type.categoryId === selectedFilterCategoryId.value.key;
    }

    return statusMatch && typeMatch && categoryMatch;
  });
});

const archiveProfile = async (profileId) => {
  const archiveData = {
    activeStatus: false, // The new value for the activeStatus field
  };
  try {
    await AssetProfileServices.update(profileId, archiveData);
    snackbarText.value = "Profile archived successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of profiles after successful deletion
    retrieveAssetProfiles();
    assetProfiles.value = assetProfiles.value.filter((c) => c.id !== profileId);
    activeAssetProfiles.value = activeAssetProfiles.value.filter(
      (c) => c.id !== profileId
    );
  } catch (error) {
    console.error(error);
    message.value = "Error archiving profile.";
  }
};

const activateProfile = async (profileId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await AssetProfileServices.update(profileId, activateData);
    snackbarText.value = "Profile activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of categories after successful deletion
    retrieveAssetProfiles();
    //assetProfiles.value = assetProfiles.value.filter((c) => c.id !== profileId);
  } catch (error) {
    console.error(error);
    message.value = "Error activating profile.";
  }
};

const baseProfileHeaders = ref([
  { title: "Profile Name", key: "profileName" },
  { title: "Type", key: "typeName" },
  { title: "# of Assets", key: "assets" },
  { title: "View Profile", key: "view", sortable: false },
]);

const activeProfileHeaders = computed(() => {
  const headers = [...baseProfileHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedProfileHeaders = computed(() => {
  const headers = [...baseProfileHeaders.value];

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

// *** Serialized Asset Section ***

// Open dialog to add a new profile
const openAddSerializedAssetDialog = () => {
  resetSerializedAssetForm();
  showAddSerializedAssetDialog.value = true;
};

const closeSerializedAssetDialog = () => {
  resetSerializedAssetForm(); // Resets form when closing or canceling the dialog
  showAddSerializedAssetDialog.value = false;
  originalSerializedAsset.value = {}; // Reset original values
};

// Reset the profile form to its default state
const resetSerializedAssetForm = () => {
  newSerializedAsset.value = {
    serialNumber: "",
    notes: "",
    warrantyDescription: "",
    warrantyNotes: "",
    profileId: "",
    acquisitionDate: null,
    purchasePrice: "",
  };
  selectedProfileId.value = "";
  validSerializedAsset.value = false;
  editingSerializedAsset.value = false;
  rawAcquisitionDate.value = null;
  rawWarrStartDate.value = null;
  rawWarrEndDate.value = null;
  serialNumberLabel.value = "Serial Number"; // Reset label to default
  barcodes.value = [];
  showAssetMaintenance.value = false;
  showAssetWarranty.value = false;
  assetMaintenanceDate.value = null;
  assetMaintenanceDesc.value = "";
};

function monthDiff(d1, d2) {
  var months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
}

// Save asset (add or edit)
const saveSerializedAsset = async () => {
  let formattedAcquisitionDate = null;
  if (rawAcquisitionDate.value) {
    // Convert local date to UTC before storing
    formattedAcquisitionDate = format(
      new Date(rawAcquisitionDate.value),
      "MMM dd, yyyy"
    );
  }
  
  const serializedAssetData = {
    serialNumber: newSerializedAsset.value.serialNumber,
    profileId: selectedProfileId.value.key,
    purchasePrice: newSerializedAsset.value.purchasePrice.replace(
      /[^0-9.-]+/g,
      ""
    ),
    acquisitionDate: formattedAcquisitionDate,
    notes: newSerializedAsset.value.notes,
  };

  try {
    // Check if editing an existing serializedAsset (i.e., `id` is present)
    if (editingSerializedAsset.value && newSerializedAsset.value.id) {
      // Call update service if editing
      if(hasSerializedAssetChanged.value){
        await SerializedAssetServices.update(
          newSerializedAsset.value.id,
          serializedAssetData
        );
      }
      if(barcodes.value !== originalBarcodes.value){
        barcodes.value.forEach(async(barcode, index) => {
          if(!barcode.barcodeId){
            let newBarcode = {
              barcode: barcode.barcode,
              barcodeType: barcode.barcodeType,
              serializedAssetId: newSerializedAsset.value.id
            }
            await BarcodeServices.create(newBarcode)
          }
          else if(barcode != originalBarcodes.value[index]){
            await BarcodeServices.update(barcode.barcodeId, barcode);
          }
        })
        deletedBarcodes.value.forEach(async(barcode, index) => {
          if(barcode.barcodeId){
            await BarcodeServices.delete(barcode.barcodeId)
          }
        })
      }
      message.value = "Asset saved successfully.";
    } else {
      const response = await SerializedAssetServices.create(serializedAssetData)
      newSerializedAsset.value.id = response.data.serializedAssetId;
      if(rawWarrStartDate.value && rawWarrEndDate.value && showAssetWarranty.value){
        await addAssetWarranty();
      }
      if(assetMaintenanceDate.value && showAssetMaintenance){
        await addAssetMaintenance();
      }
      await addAssetBarcodes();
  
      message.value = "Asset saved successfully.";
      await retrieveAssetProfiles();
    }
      
  } catch (error) {
    console.error("Error saving asset:", error);
    message.value = `Error saving asset: ${error.message || "Unknown error"}`;
  } finally {
    snackbarText.value = message.value;
    snackbar.value = true;
    resetSerializedAssetForm();
    showAddSerializedAssetDialog.value = false;
    originalSerializedAsset.value = {}; // Reset original values
  }
};

const addAssetWarranty = async() => {
  let formattedWarrStartDate = format(
    new Date(rawWarrStartDate.value),
    "MMM dd, yyyy"
  );
  let formattedWarrEndDate = format(
    new Date(rawWarrEndDate.value),
    "MMM dd, yyyy"
  );
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
  await WarrantyServices.create(newWarranty);
}

const addAssetMaintenance = async() => {
  let formattedMaintenanceDate = format(
    new Date(assetMaintenanceDate.value),
    "MMM dd, yyyy"
  );
  let newLog = {
    serializedAssetId: newSerializedAsset.value.id,
    scheduledDate: formattedMaintenanceDate,
    description: assetMaintenanceDesc.value,
    isPreventative: true,
    isRepair: false,
    isUpgrade: false
  }
  await logServices.create(newLog);
}

const addAssetBarcodes = async() => {
  barcodes.value.forEach((barcode) => {
    let newBarcode = {
      barcodeType: barcode.barcodeType,
      barcode: barcode.barcode,
      serializedAssetId: newSerializedAsset.value.id,
    };
    BarcodeServices.create(newBarcode);
  });
}

// Edit asset
const editSerializedAsset = async(serializedAssetId) => {
  // Assign existing assets properties, including its unique identifier
  let serializedAsset = {};
  try{
    const response = await SerializedAssetServices.getById(serializedAssetId);
    serializedAsset = response.data;
  }
  catch(err){
    console.error(err);
  }
  newSerializedAsset.value = {
    serialNumber: serializedAsset.serialNumber,
    profileId: serializedAsset.profileId,
    purchasePrice: serializedAsset.purchasePrice,
    acquisitionDate: serializedAsset.acquisitionDate,
    notes: serializedAsset.notes,
    id: serializedAsset.serializedAssetId,
  };
  barcodes.value = serializedAsset.barcodes.map(e => e);
  originalBarcodes.value = serializedAsset.barcodes.map(e => e)

  const profileObject = assetProfiles.value.find(
    (p) => p.key === serializedAsset.profileId
  );
  selectedProfileId.value = profileObject; // This should be the full profile object
  originalProfileId.value = serializedAsset.profileId; // Save the original profile ID
  editingSerializedAsset.value = true;
  showAddSerializedAssetDialog.value = true;

  // Set original value for hasChanged comparison
  originalSerializedAsset.value = {
    ...serializedAsset,
    profileId: selectedProfileId.value,
  };

  // Ensure that the raw acquisition date is correctly formatted for the picker

  //rawAcquisitionDate.value = new Date(serializedAsset.acquisitionDate);
  let targetTime = parseISO(serializedAsset.acquisitionDate);
  let tzDifference = targetTime.getTimezoneOffset();
  rawAcquisitionDate.value = new Date(
    targetTime.getTime() + tzDifference * 60 * 1000
  );
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

const hasSerializedAssetChanged = computed(() => {
  let purchasePrice = newSerializedAsset.value.purchasePrice.replace(
    /[^0-9.-]+/g,
    ""
  )
  let formattedAcquisitionDate = null;
  if (rawAcquisitionDate.value) {
    // Convert local date to UTC before storing
    let date = new Date(rawAcquisitionDate.value)
    let offset = date.getTimezoneOffset() * 60000
    let localDate = new Date(date.getTime() - offset)
    formattedAcquisitionDate = localDate.toISOString()
  }
  return (
    newSerializedAsset.value.serialNumber !==
      originalSerializedAsset.value.serialNumber ||
    newSerializedAsset.value.notes !== originalSerializedAsset.value.notes ||
    purchasePrice !== originalSerializedAsset.value.purchasePrice ||
    formattedAcquisitionDate !== originalSerializedAsset.value.acquisitionDate ||
    selectedProfileId.value !== originalSerializedAsset.value.profileId
  );
});

const haveBarcodesChanged = computed(() => {
  return barcodes.value !== originalBarcodes.value;
})

const hasAssetFormChanged = computed(() => {
  return hasSerializedAssetChanged.value || haveBarcodesChanged.value;
})

const canSaveAsset = computed(() => {
  return validSerializedAsset.value || hasAssetFormChanged.value
})

// *** Misc Section ***

const openArchiveDialog = (item) => {
  if (item && item.type === "serializedAsset" && item.checkoutStatus === true) {
    // If the item is a serialized asset and it is checked out
    showCannotArchiveDialog.value = true;
  } else {
    itemToArchive.value = item;
    if (item && item.type === "serializedAsset") {
      newSerializedAsset.disposalMethod = item.disposalMethod || "";
      newSerializedAsset.disposalDate = item.disposalDate || null;
      newSerializedAsset.disposalNotes = item.disposalNotes || "";
      showSerialArchiveDialog.value = true;
    } else {
      showArchiveDialog.value = true;
    }
  }
};

const confirmArchive = async () => {
  if (itemToArchive.value.type === "category") {
    await archiveCategory(itemToArchive.value.id);
  } else if (itemToArchive.value.type === "type") {
    await archiveType(itemToArchive.value.id);
  } else if (itemToArchive.value.type === "profile") {
    await archiveProfile(itemToArchive.value.id);
  } 
  showArchiveDialog.value = false;
  showSerialArchiveDialog.value = false;
  itemToArchive.value = null; // Reset after deletion
};

const openActivateDialog = (item) => {
  itemToActivate.value = item;
  showActivateDialog.value = true;
};

const confirmActivate = async () => {
  if (itemToActivate.value.type === "category") {
    await activateCategory(itemToActivate.value.id);
  } else if (itemToActivate.value.type === "type") {
    await activateType(itemToActivate.value.id);
  } else if (itemToActivate.value.type === "profile") {
    await activateProfile(itemToActivate.value.id);
  }
  showActivateDialog.value = false;
  showSerialArchiveDialog.value = false;
  itemToActivate.value = null; // Reset after deletion
};

// Watcher to update the profile selection when adding a new serialized asset
// Could not get the @change or @input to work for the v-auto, so I had to do this
watch(
  () => selectedProfileId.value,
  (newProfileId, oldProfileId) => {
    if (!newProfileId) {
      // If no profile is selected, reset the fields
      newSerializedAsset.value.purchasePrice = "";
      rawAcquisitionDate.value = null;
      rawWarrStartDate.value = null;
      rawWarrEndDate.value = null;
      newSerializedAsset.value.warrantyDescription = "";
      newSerializedAsset.value.warrantyNotes = "";
      newSerializedAsset.value.notes = "";
    } else {
      // Apply changes if adding a new asset or if the profile actually changes during edit
      if (
        !editingSerializedAsset.value ||
        newProfileId.key !== originalProfileId.value
      ) {
        updateSerialNumberLabel();
        const profile = assetProfiles.value.find(
          (p) => p.key === newProfileId.key
        );
        if (profile) {
          if(profile.warrantyStartDate) showAssetWarranty.value = true;
          newSerializedAsset.value.purchasePrice = profile.purchasePrice || "";
          newSerializedAsset.value.warrantyDescription =
            profile.warrantyDescription || "";
          newSerializedAsset.value.warrantyNotes = profile.warrantyNotes || "";

          //const tempDate = new Date(profile.acquisitionDate);
          let targetTime1 = parseISO(profile.acquisitionDate);
          let tzDifference1 = targetTime1.getTimezoneOffset();
          const acquisitionDate = new Date(
            targetTime1.getTime() + tzDifference1 * 60 * 1000
          );

          // const tempWarrStartDate = new Date(profile.warrantyStartDate);
          targetTime1 = parseISO(profile.warrantyStartDate);
          tzDifference1 = targetTime1.getTimezoneOffset();
          const tempWarrStartDate = new Date(
            targetTime1.getTime() + tzDifference1 * 60 * 1000
          );

          //const tempWarrEndDate = new Date(profile.warrantyEndDate);
          targetTime1 = parseISO(profile.warrantyEndDate);
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
        }
      }
    }
  },
  { deep: true }
);

const addBarCode = () => {
  barcodes.value.push({
    barcodeType: null,
    barcode: null,
  });
};

const removeBarCode = (index) => {
  deletedBarcodes.value.push(barcodes.value[index])
  barcodes.value.splice(index, 1);
};

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

// Clears type and profile v-autocompletes when category v-auto is cleared
watch(selectedFilterCategoryId, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    selectedFilterTypeId.value = null; // Reset selected type when category changes
    selectedFilterProfileId.value = null; // This will clear the profile selection when category is cleared
  }
});

// Clears profile v-autocomplete when type v-auto is cleared
watch(selectedFilterTypeId, (newVal) => {
  if (!newVal) {
    selectedFilterProfileId.value = null; // This will clear the profile selection when type is cleared
  }
});

watch(selectedTab, (newValue) => {
  localStorage.setItem("selectedTab", newValue);
});

watch(selectedStatus, (newValue) => {
  localStorage.setItem("selectedStatus", newValue);
});

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await getUserRole();
  const savedTab = localStorage.getItem("selectedTab");
  const savedStatus = localStorage.getItem("selectedStatus");
  if (savedTab) {
    selectedTab.value = savedTab;
    selectedStatus.value = savedStatus;
  }
  //await AssetTypeServices.getAssetTypesByCategoryId(userRole.value.categoryId);
  await retrieveAssetCategories();
  await retrieveAssetTypes();
  await retrieveAssetProfiles();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Asset Management </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="selectedTab" background-color="primary" dark dense>
            <v-tab value="SerializedAssets" color="primary">
              <v-icon left class="mr-2">mdi-cellphone-settings</v-icon>
              <!-- Icon for Assets -->
              Assets
            </v-tab>
            <v-tab value="Profiles" color="primary">
              <v-icon left class="mr-2">mdi-view-grid-plus-outline</v-icon>
              <!-- Icon for Profiles -->
              Profiles
            </v-tab>
            <v-tab value="Types" color="primary">
              <v-icon left class="mr-2">mdi-devices</v-icon>
              <!-- Icon for Types -->
              Types
            </v-tab>
            <v-tab value="Categories" color="primary">
              <v-icon left class="mr-2">mdi-folder-multiple-outline</v-icon>
              <!-- Icon for Categories -->
              Categories
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <!-- Introducing a spacer row for visual separation -->
      <v-row class="my-1"></v-row>
      <!-- Adjust 'my-1' class for desired spacing -->

      <div v-if="selectedTab != 'Categories' && selectedTab != 'SerializedAssets'">
        <v-row>
          <v-col cols="12">
            <v-tabs
              v-model="selectedStatus"
              background-color="primary"
              dark
              dense
            >
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
      </div>
      <!-- Serialized Assets section with added space after tabs -->
      <div v-if="selectedTab === 'SerializedAssets' && dataLoaded">

        <v-btn
          v-if="canAdd"
          color="primary"
          class="mb-2"
          @click="openAddSerializedAssetDialog"
        >
          Add New Asset
        </v-btn>

        <SearchAssets 
          :profiles="assetProfiles"
          :types="assetTypes"
          :user-category="userRole.data.categoryId"
          @edit-serialized-asset="editSerializedAsset"
          @open-archive-dialog="openArchiveDialog"
        />
      </div>
      <!-- Profiles filter section with added space after tabs -->
      <div v-if="selectedTab === 'Profiles'">
        <v-row class="mt-3">
          <!-- Added margin-top class here -->
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="selectedFilterTypeId"
              :items="filteredTypesForProfileAutocomplete"
              variant="outlined"
              item-text="title"
              item-value="key"
              label="Filter by Type"
              return-object
              clearable
              @clear="onTypeClear"
            ></v-autocomplete>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchProfile"
              variant="outlined"
              label="Search Profiles"
              clearable
            ></v-text-field>
          </v-col>
        </v-row>
      </div>

      <!-- Types filter -->
      <div v-if="selectedTab === 'Types'">
        <v-row class="mt-3">
          <!-- Added margin-top class here -->
          <v-col cols="12">
            <v-autocomplete
              v-model="selectedFilterCategoryId"
              :items="assetCategories"
              variant="outlined"
              item-text="title"
              item-value="key"
              label="Filter by Category"
              return-object
              clearable
              @clear="onCategoryClear"
            ></v-autocomplete>
          </v-col>
        </v-row>
      </div>

      <v-row v-if="dataLoaded">
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Active Categories Section -->
            <div v-if="selectedTab === 'Categories'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Accessible Categories</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="baseCategoryHeaders"
                    :items="assetCategories"
                    item-key="key"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50]"
                    v-model:sort-by="categoriesSortBy"
                  >
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- Active Types Section -->
            <div v-if="selectedTab === 'Types' && selectedStatus === 'Active'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active Types</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="openAddTypeDialog"
                    >
                      Add New Type
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="activeTypeHeaders"
                    :items="filteredAssetTypes"
                    item-key="key"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50]"
                    v-model:sort-by="typesSortBy"
                  >
                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editType(item)">
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
                            type: 'type',
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

            <!-- Archived Types Section -->
            <div
              v-if="selectedTab === 'Types' && selectedStatus === 'Archived'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Archived Types</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedTypeHeaders"
                    :items="filteredAssetTypes"
                    item-key="key"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50]"
                    v-model:sort-by="typesSortBy"
                  >
                    <template v-slot:item.activate="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="
                          openActivateDialog({
                            id: item.key,
                            type: 'type',
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

            <!-- Active profiles Section -->
            <div
              v-if="selectedTab === 'Profiles' && selectedStatus === 'Active'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active Profiles</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="openAddProfileDialog"
                      >Add New Profile</v-btn
                    >
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="activeProfileHeaders"
                    :items="filteredAssetProfiles"
                    :search="searchProfile"
                    item-key="profileId"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50]"
                    v-model:sort-by="profilesSortBy"
                  >
                    <template v-slot:item.assets="{ item }">
                      {{ item.assetsCount }}
                    </template>
                    <template v-slot:item.view="{ item }">
                      <div
                        class="d-flex align-center justify-start"
                        style="padding-left: 10%"
                      >
                        <v-btn
                          icon
                          class="table-icons"
                          @click="viewProfile(item.profileId)"
                        >
                          <v-icon>mdi-eye</v-icon>
                        </v-btn>
                      </div>
                    </template>
                    <template v-slot:item.edit="{ item }">
                      <v-btn
                        icon
                        class="table-icons"
                        @click="sendEditProfile(item)"
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
                            type: 'profile',
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

            <!-- Archived profiles Section -->
            <div
              v-if="selectedTab === 'Profiles' && selectedStatus === 'Archived'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Archived Profiles</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedProfileHeaders"
                    :items="filteredAssetProfiles"
                    :search="searchProfile"
                    item-key="profileId"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50]"
                    v-model:sort-by="profilesSortBy"
                  >
                    <template v-slot:item.assets="{ item }">
                      {{ item.assetsCount }}
                    </template>
                    <template v-slot:item.view="{ item }">
                      <div
                        class="d-flex align-center justify-start"
                        style="padding-left: 15%"
                      >
                        <v-btn
                          icon
                          class="table-icons"
                          @click="viewProfile(item.profileId)"
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
                            type: 'profile',
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
            <!-- Archived serialized assets Section -->
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

    <!-- Add/Edit Type Dialog -->
    <v-dialog v-model="showAddTypeDialog" max-width="900px">
      <EditType
        :rules="rules"
        :categories="assetCategories"
        :type="newType"
        @closeModal="closeTypeDialog"
        @saveType="saveType"
      />
    </v-dialog>

    <!-- Add/Edit Profile Dialog -->
    <v-dialog v-model="showAddProfileDialog" max-width="800px">
      <ProfileDialog
        :rules="rules"
        :selected-profile="selectedProfile"
        :userCategoryId="userRoleCategoryId"
        @closeDialog="handleCloseProfileDialog"
        @updateSnackbar="handleUpdatedProfile"
        @saveSnackbar="handleSavedProfile"
      />
    </v-dialog>

    <!-- Add/Edit serializedAsset Dialog -->
    <v-dialog v-model="showAddSerializedAssetDialog" max-width="800px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span>{{ editingSerializedAsset ? "Edit" : "Add" }} Asset</span>
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
                <v-col cols="12">
                  <!-- Asset Profile Selection -->
                  <v-autocomplete
                    label="Profile"
                    variant="outlined"
                    :items="activeAssetProfiles"
                    item-text="title"
                    item-value="key"
                    v-model="selectedProfileId"
                    :rules="[rules.required]"
                    clearable
                    return-object
                    prepend-icon="mdi-view-grid-plus-outline"
                  ></v-autocomplete>
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
                <v-col cols="12" class="mb-n8" v-if="!editingSerializedAsset">
                  <v-checkbox 
                    v-model="showAssetWarranty"
                    color="primary"
                    label="Add Warranty"
                  />
                </v-col>
                <v-col cols="12" v-if="!editingSerializedAsset && showAssetWarranty">
                  <v-text-field
                    label="Warranty Description"
                    variant="outlined"
                    v-model="newSerializedAsset.warrantyDescription"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" v-if="!editingSerializedAsset && showAssetWarranty">
                  <v-text-field
                    label="Warranty Notes"
                    variant="outlined"
                    v-model="newSerializedAsset.warrantyNotes"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-text-field>
                </v-col>
                <v-col cols="6" v-if="!editingSerializedAsset && showAssetWarranty">
                  <v-date-input
                    v-model="rawWarrStartDate"
                    clearable
                    label="Warranty Start Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  ></v-date-input>
                </v-col>
                <v-col cols="6" v-if="!editingSerializedAsset && showAssetWarranty">
                  <v-date-input
                    v-model="rawWarrEndDate"
                    clearable
                    label="Warranty End Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  ></v-date-input>
                </v-col>
                <v-col cols="12" class="mb-n8" v-if="!editingSerializedAsset">
                  <v-checkbox 
                    v-model="showAssetMaintenance"
                    color="primary"
                    label="Schedule Maintenance"
                  />
                </v-col>
                <v-col cols="12" v-if="showAssetMaintenance">
                  <v-date-input 
                    v-model="assetMaintenanceDate"
                    clearable
                    label="Maintenance Date"
                    variant="outlined"
                    color="blue"
                    prepend-icon="mdi-calendar"
                  />
                </v-col>
                <v-col cols="12" v-if="showAssetMaintenance">
                  <v-text-field
                    label="Maintenance Description"
                    variant="outlined"
                    v-model="assetMaintenanceDesc"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-row v-for="(barcode, index) in barcodes">
                    <v-col cols="4">
                      <v-select
                        v-model="barcode.barcodeType"
                        :items="['MAC', 'Wireless NIC', 'Onboard NIC']"
                        label="Barcode Type"
                        variant="outlined"
                        dense
                        :rules="[rules.required]"
                        prepend-icon="mdi-barcode"
                      ></v-select>
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        label="Barcode"
                        variant="outlined"
                        v-model="barcode.barcode"
                        :rules="[rules.required]"
                        maxlength="30"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="2">
                      <v-btn icon @click="removeBarCode(index)">
                        <v-icon color="primary">mdi-delete</v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-col>

                <v-col cols="12">
                  <v-tooltip bottom>
                    <template v-slot:activator="{ attrs }">
                      <v-btn
                        color="primary"
                        @click="addBarCode"
                        icon
                        v-bind="attrs"
                      >
                        <v-icon left>mdi-plus</v-icon>
                      </v-btn>
                      Add Barcode
                    </template>
                    <span>Add a new field to the asset type</span>
                  </v-tooltip>
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
            :disabled="!canSaveAsset"
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
        <v-card-text>Are you sure you want to Archive this item? </v-card-text>
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
          >Ok to Activate</v-card-title
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

    <!-- Cannot Archive Dialog -->
    <v-dialog v-model="showCannotArchiveDialog" max-width="500px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Cannot Archive</v-card-title
        >
        <v-card-text
          >This item is currently checked out. The item needs to be returned
          before it can be archived.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="cancelgrey"
            text
            @click="showCannotArchiveDialog = false"
            >Cancel</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
