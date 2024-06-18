<script setup>
import { ref, toRefs, watch, onMounted, computed, reactive } from "vue";
import { vMaska } from "maska";
import { parseISO, format } from "date-fns";
import moment from "moment-timezone";
import ProfileDataServices from "../services/profileDataServices";
import AssetProfileServices from "../services/assetProfileServices";
import AssetTypeServices from "../services/assetTypeServices";

const message = ref("");
const validProfile = ref(false);
const assetCategories = ref([]);
const assetTypes = ref([]);
const selectedTypeId = ref("");
const generateDynamicFields = ref([]);
const originalProfile = ref({});
const originalDynamicFields = ref([]);
const initialTypeId = ref("");
const rawAcquisitionDate = ref(null);
const rawWarrStartDate = ref(null);
const rawWarrEndDate = ref(null);
const menu = ref(false);
const menu1 = ref(false);
const menu2 = ref(false);

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

// Validation Rules
const rules = {
  required: (value) => !!value || "Required.",
  maxNotesLength: (value) => {
    if (!value) return true; // If value is undefined or null, consider this validation as passed
    return value.length <= 255 || "Max length of 255 characters";
  },
  maxFieldLength: (value) => {
    if (!value) return true; // Similar check for other validations
    return value.length <= 50 || "Max length of 50 characters";
  },
  serialNumberLength: (value) => {
    if (!value) return true;
    return value.length <= 20 || "Max length of 20 characters";
  },
  validPrice: (value) => {
    value.value > 0 || "Enter a valid price";
  },
};

const emit = defineEmits(["closeDialog", "updateSnackbar", "saveSnackbar"]);

// Receive props from AssetManage
const props = defineProps({
  editingProfile: {
    required: false,
    default: false,
  },
  sendEditProfile: {
    type: Function,
    required: true,
  },
  selectedProfile: {
    required: false,
  },
});

// Deconstruct props => refs
const { editingProfile, selectedProfile } = toRefs(props);

const newProfile = ref({
  profileName: "",
  typeId: "",
  purchasePrice: "",
  acquisitionDate: "",
  notes: "",
  warrantyStartDate: "",
  warrantyEndDate: "",
  warrantyDescription: "",
});

// The naming is confusing however newData is meant for the backend ProfileData object
const newData = ref({
  field: "",
  data: "",
  profileId: "",
});

// When you load the profile for editing, store the initial state
const loadProfileForEditing = async (profile) => {
  if (profile.profileId) {
    await fetchDynamicFields(profile.profileId);
  }

  // Correctly assign `rawAcquisitionDate`
  if (profile.acquisitionDate) {
    //rawAcquisitionDate.value = parseISO(profile.acquisitionDate);
    let targetTime = parseISO(profile.acquisitionDate);
    let tzDifference = targetTime.getTimezoneOffset();
    let offsetTime = new Date(targetTime.getTime() + tzDifference * 60 * 1000);
    rawAcquisitionDate.value = offsetTime;
  } else {
    rawAcquisitionDate.value = null; // Fallback if there's no acquisition date
  }

  // Correctly assign `rawWarrStartDate`
  if (profile.warrantyStartDate) {
    //rawWarrStartDate.value = parseISO(profile.warrantyStartDate);
    let targetTime = parseISO(profile.warrantyStartDate);
    let tzDifference = targetTime.getTimezoneOffset();
    let offsetTime = new Date(targetTime.getTime() + tzDifference * 60 * 1000);
    rawWarrStartDate.value = offsetTime;
  } else {
    rawWarrStartDate.value = null; // Fallback if there's no acquisition date
  }
  // Correctly assign `rawWarrEndDate`
  if (profile.warrantyEndDate) {
    //rawWarrEndDate.value = parseISO(profile.warrantyEndDate);
    let targetTime = parseISO(profile.warrantyEndDate);
    let tzDifference = targetTime.getTimezoneOffset();
    let offsetTime = new Date(targetTime.getTime() + tzDifference * 60 * 1000);
    rawWarrEndDate.value = offsetTime;
  } else {
    rawWarrEndDate.value = null; // Fallback if there's no acquisition date
  }

  // Correctly set `selectedTypeId`
  selectedTypeId.value = profile.typeId;

  // Ensure `generateDynamicFields` is populated
  if (generateDynamicFields.value.length === 0) {
    console.error("Dynamic fields not populated correctly.");
  }

  // Update `originalProfile` for comparison
  originalProfile.value = {
    profileName: profile.profileName,
    typeId: profile.typeId,
    purchasePrice: profile.purchasePrice,
    acquisitionDate: profile.acquisitionDate,
    notes: profile.notes,
    warrantyStartDate: profile.warrantyStartDate,
    warrantyEndDate: profile.warrantyEndDate,
    warrantyDescription: profile.warrantyDescription,
  };

  initialTypeId.value = profile.typeId; // Store initial typeId
};

// Retrieve Types from Database
const retrieveAssetTypes = async () => {
  try {
    const typesResponse = await AssetTypeServices.getAll();
    assetTypes.value = typesResponse.data.map((type) => ({
      ...type,
      key: type.typeId,
      title: type.typeName,
      description: type.desc,
      categoryName:
        assetCategories.value.find((c) => c.key === type.categoryId)?.title ||
        "Unknown Category",
      dynamicFields: JSON.parse(type.dynamicFields || "[]"), // Ensure correct parsing here
    }));
  } catch (error) {
    console.error("Error loading types:", error);
    message.value = "Failed to load types.";
  }
};

// Retrieve ProfileData from Database
const retrieveProfileData = async () => {
  try {
    const response = await ProfileDataServices.getAll();
    if (response.data.length == 0) {
      newData.value = [];
      message.value = "No profile data";
    } else {
      newData.value = response.data.map((data) => {
        return {
          ...data,
          key: data.profileDataId,
          title: data.field,
        };
      });
    }
  } catch (error) {
    console.error("Error loading profile data:", error);
    message.value = "Failed to load profile data.";
  }
};

const fetchDynamicFields = async (profileId) => {
  try {
    const response = await ProfileDataServices.getByProfileId(profileId);
    console.log("fetchDynamicFields response:", JSON.stringify(response.data));
    if (response.data && response.data.length > 0) {
      generateDynamicFields.value = response.data.map((df) => ({
        fieldName: df.field || "Undefined Field",
        fieldValue: df.data || "",
        fieldId: df.profileDataId, // Check if this is correct
        fieldType: df.fieldType || "text",
      }));
      console.log(
        "Dynamic fields set:",
        JSON.stringify(generateDynamicFields.value)
      );
    } else {
      console.error("No dynamic fields found for the profile.");
      generateDynamicFields.value = []; // Clear if no fields are found
    }
  } catch (error) {
    console.error("Error fetching dynamic fields:", error);
  }
};

// Save profile (add or edit)
const saveProfile = async () => {
  const purchasePrice = newProfile.value.purchasePrice.replace(/[$,]/g, "");

  let formattedAcquisitionDate = null;
  formattedAcquisitionDate = format(
    new Date(rawAcquisitionDate.value),
    "yyyy-MM-dd"
  );

  let formattedWarrStartDate = null;
  formattedWarrStartDate = format(
    new Date(rawWarrStartDate.value),
    "yyyy-MM-dd"
  );

  let formattedWarrEndDate = null;
  formattedWarrEndDate = format(new Date(rawWarrEndDate.value), "yyyy-MM-dd");

  const profilePayload = {
    profileName: newProfile.value.profileName,
    notes: newProfile.value.notes,
    purchasePrice: purchasePrice,
    acquisitionDate: formattedAcquisitionDate,
    typeId: selectedTypeId.value.typeId,
    warrantyStartDate: formattedWarrStartDate,
    warrantyEndDate: formattedWarrEndDate,
    warrantyDescription: newProfile.value.warrantyDescription,
  };

  try {
    if (newProfile.value.id && selectedTypeId.value !== initialTypeId.value) {
      // Delete existing profile data first
      await ProfileDataServices.deleteByProfileId(newProfile.value.id);
    }

    // Check if editing profile
    if (newProfile.value.id) {
      // Update the profile itself
      const response = await AssetProfileServices.update(
        newProfile.value.id,
        profilePayload
      );

      // Update the profile data
      await saveProfileData(newProfile.value.id);

      emitUpdateSnackbar();
    } else if (!newProfile.value.id) {
      // Create new profile
      const createResponse = await AssetProfileServices.create(profilePayload);
      if (createResponse.data && createResponse.data.profileId) {
        newProfile.value.id = createResponse.data.profileId;
        await saveProfileData(newProfile.value.id);
        emitSaveSnackbar();
      }
    }
  } catch (error) {
    console.error("Error saving profile:", error);
    message.value = `Error saving profile: ${error.message || "Unknown error"}`;
  } finally {
    emitCloseDialog();
  }
};

// Save profileData
const saveProfileData = async (profileId) => {
  console.log(
    "Saving Profile Data",
    JSON.stringify(generateDynamicFields.value)
  );

  for (const field of generateDynamicFields.value) {
    const payload = {
      field: field.fieldName,
      data: field.fieldValue,
      profileId: profileId,
    };

    try {
      if (field.fieldId) {
        console.log(
          "Updating existing field data with fieldId:",
          field.fieldId
        );
        await ProfileDataServices.update(field.fieldId, payload);
      } else {
        console.log("Field ID missing, creating new field data.");
        const response = await ProfileDataServices.create(payload);
        field.fieldId = response.data.profileDataId; // Ensure this matches the response structure
      }
    } catch (error) {
      console.error("Error updating/creating field:", field.fieldName, error);
    }
  }
};

// Edit profile
const editProfile = async () => {
  if (selectedProfile.value) {
    try {
      // Assign existing profile's properties, including its unique identifier
      newProfile.value = {
        ...selectedProfile.value,
        id: selectedProfile.value.profileId,
      };
      selectedTypeId.value = selectedProfile.value.typeId;
    } catch (error) {
      console.error("Error editing profile, ", error);
    }
  }
};

const editProfileData = async () => {
  if (selectedProfile.value) {
    try {
      await retrieveProfileData();

      const profileDataForProfile = newData.value.filter(
        (data) => data.profileId === selectedProfile.value.profileId
      );

      // Reset generateDynamicFields before re-populating
      generateDynamicFields.value = profileDataForProfile.map((dataItem) => {
        return {
          ...dataItem,
          fieldName: dataItem.field, // Assuming 'field' is the correct property name
          fieldValue: dataItem.data,
          fieldType: "text", // Default type or determine from data
        };
      });
    } catch (error) {
      console.error("Error fetching profileData", error);
      message.value = `Error fetching profileData: ${
        error.message || "unknown error"
      }`;
    }
  }
};

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

// const hasProfileChanged = () => {
//   if (editingProfile.value) {
//     // Assuming selectedTypeId.value holds the currently selected type object
//     const currentTypeId = selectedTypeId.value?.key || selectedTypeId.value;
//     // Strip out white space and $ for comparison
//     const newPurchasePrice = newProfile.value.purchasePrice.replace(
//       /[$,]/g,
//       ""
//     );
//     return (
//       newProfile.value.profileName !== originalProfile.value.profileName ||
//       currentTypeId !== originalProfile.value.typeId || // Adjust this line
//       newPurchasePrice !== originalProfile.value.purchasePrice ||
//       newProfile.value.acquisitionDate !==
//         originalProfile.value.acquisitionDate ||
//       newProfile.value.notes !== originalProfile.value.notes
//     );
//   }
// };

// Utility function to check if a dynamic field has changed
const hasDynamicFieldChanged = (field) => {
  // Find the original field with the same name
  const originalField = originalDynamicFields.value.find(
    (original) => original.fieldName === field.fieldName
  );
  // If there is no original field (which means it's a new field), or if the data has changed, return true
  return !originalField || originalField.fieldValue !== field.fieldValue;
};

// const canSave = computed(() => {
//   // Check if the profile itself has changed
//   const profileChanged = hasProfileChanged();

//   // Check if any of the dynamic fields have changed
//   const dynamicFieldChanged = generateDynamicFields.value.some((field) =>
//     hasDynamicFieldChanged(field)
//   );

//   // Enable Save button if there are changes to save
//   return !(validProfile.value && (profileChanged || dynamicFieldChanged));
// });

// Groups the text fields into row with 3 columns
const groupFields = computed(() => {
  const rowOfFields = [];
  for (let i = 0; i < generateDynamicFields.value.length; i += 3) {
    rowOfFields.push(generateDynamicFields.value.slice(i, i + 3));
  }
  return rowOfFields;
});

const emitCloseDialog = () => {
  emit("closeDialog");
};

const emitSaveSnackbar = () => {
  emit("saveSnackbar");
};

const emitUpdateSnackbar = () => {
  emit("updateSnackbar");
};

// Watchers

watch(selectedTypeId, (newVal) => {
  const typeId = newVal?.typeId || newVal;
  const selectedType = assetTypes.value.find((type) => type.key === typeId);

  if (selectedType) {
    let dynamicFields = selectedType.dynamicFields;

    if (typeof dynamicFields === "string") {
      try {
        dynamicFields = JSON.parse(dynamicFields); // Parse if needed
      } catch (error) {
        console.error("Error parsing dynamicFields:", error);
        dynamicFields = []; // Default to empty array if parsing fails
      }
    }

    if (Array.isArray(dynamicFields)) {
      generateDynamicFields.value = dynamicFields.map((field) => ({
        fieldName: field.fieldName || "Unnamed Field",
        fieldValue: field.fieldValue || "",
        fieldType: field.fieldType || "text",
      }));
    } else {
      console.error("dynamicFields is not an array:", dynamicFields);
    }
  } else {
    generateDynamicFields.value = [];
  }
});

// Watch for changes in selectedProfile and update the form accordingly
watch(
  selectedProfile,
  (newValue, oldValue) => {
    console.log("selectedProfile changed from", oldValue, "to", newValue);

    if (newValue) {
      // Ensure all fields are assigned correctly
      newProfile.value.profileName = newValue.profileName || "";
      newProfile.value.typeId = newValue.typeId || "";
      newProfile.value.purchasePrice = newValue.purchasePrice || "";
      newProfile.value.acquisitionDate = newValue.acquisitionDate || "";
      newProfile.value.notes = newValue.notes || "";
      newProfile.value.warrantyStartDate = newValue.warrantyStartDate || "";
      newProfile.value.warrantyEndDate = newValue.warrantyEndDate || "";
      newProfile.value.warrantyDescription = newValue.warrantyDescription || "";

      if (newValue.typeId) {
        selectedTypeId.value = newValue.typeId; // Update `selectedTypeId`
      }

      if (newValue.acquisitionDate) {
        let targetTime = parseISO(newValue.acquisitionDate);
        let tzDifference = targetTime.getTimezoneOffset();
        let offsetTime = new Date(
          targetTime.getTime() + tzDifference * 60 * 1000
        );
        rawAcquisitionDate.value = offsetTime;
        //rawAcquisitionDate.value = parseISO(newValue.acquisitionDate);
        //convert the offset to milliseconds, add to targetTime, and make a new Date

        console.log("rawAq " + rawAcquisitionDate.value); // Update date
      }
      if (newValue.warrentyStartDate) {
        rawWarrStartDate.value = parseISO(newValue.warrentyStartDate); // Update date
      }
      if (newValue.warrentyEndDate) {
        rawWarrEndDate.value = parseISO(newValue.warrentyEndDate); // Update date
      }
    } else {
      console.error("Selected profile is undefined or null");
    }
  },
  { immediate: true, deep: true }
);

watch(
  selectedProfile,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      editProfile();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  try {
    await retrieveAssetTypes(); // Ensure asset types are loaded

    if (selectedProfile.value?.profileId) {
      await fetchDynamicFields(selectedProfile.value.profileId); // Ensure dynamic fields are fetched
    }

    if (editingProfile.value) {
      loadProfileForEditing(selectedProfile.value); // Load the profile for editing
    }
  } catch (error) {
    console.error("Error during initialization:", error);
    message.value = "Failed to load profile data.";
  }
});
</script>

<template>
  <v-card class="pa-4 rounded-xl">
    <v-card-title>
      <span class="headline"
        >{{ editingProfile ? "Edit" : "Add" }} Profile</span
      >
    </v-card-title>
    <v-card-text>
      <v-form ref="formProfile" v-model="validProfile">
        <v-container id="attach">
          <v-row>
            <v-col cols="12">
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    label="Profile Name"
                    variant="outlined"
                    v-model="newProfile.profileName"
                    :rules="[rules.required, rules.maxFieldLength]"
                    maxlength="50"
                    counter
                    prepend-icon="mdi-rename"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <!-- Asset Type Selection -->
                  <v-autocomplete
                    label="Type"
                    variant="outlined"
                    :items="assetTypes"
                    item-text="title"
                    item-value="key"
                    v-model="selectedTypeId"
                    :rules="[rules.required]"
                    clearable
                    return-object
                    prepend-icon="mdi-devices"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    label="Purchase Price"
                    variant="outlined"
                    v-model="newProfile.purchasePrice"
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
                <v-col>
                  <v-menu
                    v-model="menu"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="formattedAcquisitionDate"
                        label="Acquisition Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="menu = !menu"
                      ></v-text-field>
                    </template>

                    <v-date-picker
                      v-model="rawAcquisitionDate"
                      timezone="UTC"
                      @input="menu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Warranty Description"
                    prepend-icon="mdi-note"
                    variant="outlined"
                    v-model="newProfile.warrantyDescription"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-menu
                    v-model="menu1"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="formattedWarrStartDate"
                        label="Warranty Start Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="menu1 = !menu1"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="rawWarrStartDate"
                      @input="menu1 = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
                <v-col>
                  <v-menu
                    v-model="menu2"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="formattedWarrEndDate"
                        label="Warranty End Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="menu2 = !menu2"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="rawWarrEndDate"
                      @input="menu2 = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
              </v-row>
            </v-col>
            <template
              v-for="(field, index) in generateDynamicFields"
              :key="index"
            >
              <v-col cols="4" v-if="field.fieldType === 'boolean'">
                <v-switch
                  v-model="field.fieldValue"
                  :label="field.fieldName"
                  variant="outlined"
                  prepend-icon="field"
                ></v-switch>
              </v-col>
              <v-col cols="4" v-else>
                <v-text-field
                  v-model="field.fieldValue"
                  :label="field.fieldName"
                  variant="outlined"
                  prepend-icon="field"
                ></v-text-field>
              </v-col>
            </template>
            <!-- the prepend-icon here is used to create a spacer for alignment purposes.
                  Funnily enough, if the name is incorrect it makes a mdi icon sized blank space. -->

            <v-col cols="12">
              <v-textarea
                label="Notes"
                prepend-icon="mdi-note"
                variant="outlined"
                v-model="newProfile.notes"
                :rules="[rules.maxNotesLength]"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="cancelgrey" text @click="emitCloseDialog">Cancel</v-btn>
      <v-btn color="saveblue" @click="saveProfile">Save</v-btn>
    </v-card-actions>
  </v-card>
</template>

<!-- Love, "Zane" and Jaxen-->
