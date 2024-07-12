<script setup>
import { ref, toRefs, watch, onMounted, computed, reactive } from "vue";
import { vMaska } from "maska";
import { parseISO, format } from "date-fns";
import moment from "moment-timezone";
import ProfileDataServices from "../services/profileDataServices";
import AssetProfileServices from "../services/assetProfileServices";
import AssetTypeServices from "../services/assetTypeServices";
import assetTypeServices from "../services/assetTypeServices";
import customFieldValueServices from "../services/customFieldValueServices";
import customFieldTypeServices from "../services/customFieldTypeServices";
import profileDataServices from "../services/profileDataServices";

const message = ref("");
const validProfile = ref(false);
const assetTypes = ref([]);
const selectedTypeId = ref("");
const titleArray = ref([]);
const customFields = ref([]);
const originalProfile = ref({});
const initialTypeId = ref("");
const rawAcquisitionDate = ref(null);
const rawWarrStartDate = ref(null);
const rawWarrEndDate = ref(null);
const menu = ref(false);

const menu1 = ref(false);
const menu2 = ref(false);

const editMode = ref(false);
const overrideTitle = ref(false);
const dataLoaded = ref(false);
const profileInfoChanged = ref(false);

const intRegex = /^-?\d+$/;
const intTest = (value) => intRegex.test(value) || "Enter only integers";
const decRegex = /^-?\d+(\.\d+)?$/;
const decTest = (value) => decRegex.test(value) || "Enter only decimals";
const filterIntegerInput = (event) => {
  const value = event.target.value;
  event.target.value = value.replace(/[^\d-]/g, "");
};
const filterDecimalInput = (event) => {
  const value = event.target.value;
  event.target.value = value
    .replace(/[^0-9.-]/g, "")
    .replace(/(\..*?)\..*/g, "$1")
    .replace(/(\-.*?)-.*/g, "$1");
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

const emit = defineEmits(["closeDialog", "updateSnackbar", "saveSnackbar"]);

// Receive props from AssetManage
const props = defineProps({
  selectedProfile: {
    required: false,
  },
  rules: {
    required: true,
  },
  userCategoryId: {
    required: true,
  },
});

// Deconstruct props => refs
const { selectedProfile, rules } = toRefs(props);

const newProfile = ref({
  profileName: "",
  typeId: "",
  purchasePrice: "",
  acquisitionDate: "",
  notes: "",
  warrantyStartDate: null,
  warrantyEndDate: null,
  warrantyDescription: "",
  warrantyNotes: "",
  features: "",
  accessories: "",
});

const changeProfileInfo = () => {
  profileInfoChanged.value = true;
};

// When you load the profile for editing, store the initial state
const loadProfileForEditing = async (profile) => {
  selectedTypeId.value = profile.typeId;
  await retrieveCustomFields(selectedTypeId.value);
  if (profile.profileId) {
    await retrieveFieldValues(profile.profileId);
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
    rawWarrStartDate.value = null; // Fallback if there's no Start date
  }
  // Correctly assign `rawWarrEndDate`
  if (profile.warrantyEndDate) {
    //rawWarrEndDate.value = parseISO(profile.warrantyEndDate);
    let targetTime = parseISO(profile.warrantyEndDate);
    let tzDifference = targetTime.getTimezoneOffset();
    let offsetTime = new Date(targetTime.getTime() + tzDifference * 60 * 1000);
    rawWarrEndDate.value = offsetTime;
  } else {
    rawWarrEndDate.value = null; // Fallback if there's no end date
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
    warrantyNotes: profile.warrantyNotes,
    features: profile.features,
    accessories: profile.accessories,
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
      activeStatus: type.activeStatus,
      categoryId: type.categoryId,
    }));

    assetTypes.value = assetTypes.value.filter(
      (type) =>
        type.activeStatus === true &&
        (props.userCategoryId === 4 || type.categoryId == props.userCategoryId)
    );
    assetTypes.value.sort((a, b) => a.typeName.localeCompare(b.typeName));
  } catch (error) {
    console.error("Error loading types:", error);
    message.value = "Failed to load types.";
  }
};

const retrieveCustomFields = async (typeId) => {
  try {
    let response = await customFieldTypeServices.getAllForType(typeId);
    let customFieldPromises = response.data.map(async (field) => {
      let newField = {
        fieldTypeId: field.id,
        customFieldId: field.customFieldId,
        name: field.customField.name,
        type: field.customField.type,
        required: field.required,
        identifier: field.identifier,
        fieldValueId: null,
        value: "",
        profileDataId: null,
        listValues: {},
        sequence: field.sequence,
        changed: false,
      };

      if (newField.type === "List") {
        let data = await customFieldValueServices.getAllForField(
          newField.customFieldId
        );
        newField.listValues = data.data;
      }
      return newField;
    });

    let customFieldsArray = await Promise.all(customFieldPromises);
    customFields.value.push(...customFieldsArray);
  } catch (err) {
    console.error(err);
  }
};

const retrieveFieldValues = async (profileId) => {
  let response = await profileDataServices.getByProfileId(profileId);
  let profileData = response.data;
  profileData.forEach((profile) => {
    let customField = customFields.value.find(
      (field) => field.customFieldId === profile.customFieldValue.customFieldId
    );
    customField.value = profile.customFieldValue.value;
    customField.fieldValueId = profile.fieldValueId;
    customField.profileDataId = profile.profileDataId;
    if (customField.sequence) {
      titleArray.value[customField.sequence - 1] = customField.value;
    }
  });
};

const changeFieldValue = (field) => {
  field.changed = true;
  if (field.type == "List") {
    let newValue = field.listValues.find(
      (listValue) => listValue.value === field.value
    );
    if (newValue) {
      field.fieldValueId = newValue.id;
    } else field.fieldValueId = null;
  }
  updateTitle(field.value, field.sequence);
};

const updateTitle = (value, sequence) => {
  if (sequence > 0 && !overrideTitle.value) {
    titleArray.value[sequence - 1] = value;
    newProfile.value.profileName = titleArray.value.join(" ");
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
  if (rawWarrStartDate.value)
    formattedWarrStartDate = format(
      new Date(rawWarrStartDate.value),
      "yyyy-MM-dd"
    );

  let formattedWarrEndDate = null;
  if (rawWarrEndDate.value)
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
    warrantyNotes: newProfile.value.warrantyNotes,
    features: newProfile.value.features,
    accessories: newProfile.value.accessories,
  };

  try {
    // Check if editing profile
    if (newProfile.value.id && profileInfoChanged.value) {
      // Update the profile itself
      const response = await AssetProfileServices.update(
        newProfile.value.id,
        profilePayload
      );

      // Update the profile data

      await saveFieldValues(newProfile.value.id);

      emitUpdateSnackbar();
    } else if (!newProfile.value.id) {
      // Create new profile
      const createResponse = await AssetProfileServices.create(profilePayload);
      if (createResponse.data && createResponse.data.profileId) {
        newProfile.value.id = createResponse.data.profileId;

        await saveFieldValues(newProfile.value.id);

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

const saveFieldValues = async (profileId) => {
  for (let field of customFields.value) {
    if (field.changed) {
      let fieldValueId;
      let data = {
        customFieldId: field.customFieldId,
        value: field.value,
      };
      try {
        if (field.fieldValueId && field.type != "List") {
          fieldValueId = field.fieldValueId;
          await customFieldValueServices.update(fieldValueId, data);
        } else if (field.fieldValueId && field.type == "List") {
          let newFieldValue = { fieldValueId: field.fieldValueId };
          await profileDataServices.update(field.profileDataId, newFieldValue);
        } else {
          let response = await customFieldValueServices.create(data);
          fieldValueId = response.data.id;
          let profileData = {
            profileId: profileId,
            fieldValueId: fieldValueId,
          };
          await profileDataServices.create(profileData);
        }
      } catch (err) {
        console.error(err);
      }
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

watch(selectedTypeId, async (newVal) => {
  if (dataLoaded.value) {
    const typeId = newVal?.typeId || newVal;
    customFields.value = [];
    await retrieveCustomFields(typeId);
  }
});

// Watch for changes in selectedProfile and update the form accordingly
watch(
  selectedProfile,
  (newValue, oldValue) => {
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
      newProfile.value.warrantyNotes = newValue.warrantyNotes || "";
      newProfile.value.features = newValue.features || "";
      newProfile.value.accessories = newValue.accessories || "";
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
      }
      if (newValue.warrantyStartDate) {
        let targetTime = parseISO(newValue.warrantyStartDate);
        let tzDifference = targetTime.getTimezoneOffset();
        let offsetTime = new Date(
          targetTime.getTime() + tzDifference * 60 * 1000
        );
        rawWarrStartDate.value = offsetTime;
      }
      if (newValue.warrantyEndDate) {
        let targetTime = parseISO(newValue.warrantyEndDate);
        let tzDifference = targetTime.getTimezoneOffset();
        let offsetTime = new Date(
          targetTime.getTime() + tzDifference * 60 * 1000
        );
        rawWarrEndDate.value = offsetTime;
      }
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
      editMode.value = true;
    }

    if (editMode.value) {
      loadProfileForEditing(selectedProfile.value); // Load the profile for editing
      overrideTitle.value = !titleArray.value.length > 0;
    }
  } catch (error) {
    console.error("Error during initialization:", error);
    message.value = "Failed to load profile data.";
  }
  dataLoaded.value = true;
});
</script>

<template>
  <v-card class="pa-4 rounded-xl">
    <v-card-title>
      <span class="headline">{{ editMode ? "Edit" : "Add" }} Profile</span>
    </v-card-title>
    <v-card-text>
      <v-form ref="formProfile" v-model="validProfile">
        <v-container id="attach">
          <v-row>
            <v-col cols="12">
              <v-row>
                <v-col cols="12">
                  <v-autocomplete
                    label="Type"
                    variant="outlined"
                    :items="assetTypes"
                    item-text="typeName"
                    item-value="typeId"
                    v-model="selectedTypeId"
                    :rules="[rules.required]"
                    clearable
                    return-object
                    :disabled="editMode"
                    prepend-icon="mdi-devices"
                    @update:modelValue="changeProfileInfo"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="7">
                  <v-text-field
                    label="Profile Name"
                    variant="outlined"
                    v-model="newProfile.profileName"
                    :rules="[rules.required, rules.maxNameLength]"
                    maxlength="50"
                    counter
                    prepend-icon="mdi-rename"
                    :disabled="!overrideTitle"
                    @update:modelValue="changeProfileInfo"
                  ></v-text-field>
                </v-col>
                <v-col cols="5">
                  <v-checkbox
                    v-model="overrideTitle"
                    color="primary"
                    label="Override Name Generation"
                  ></v-checkbox>
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
                    @update:modelValue="changeProfileInfo"
                  ></v-text-field>
                </v-col>

                <v-col>
                  <v-date-input
                    prepend-icon="mdi-calendar"
                    v-model="rawAcquisitionDate"
                    clearable
                    label="Aqusition Date"
                    variant="outlined"
                    color="blue"
                  ></v-date-input>
                </v-col>
                <v-col cols="6">
                  <v-textarea
                    prepend-icon="mdi-memory"
                    label="Features"
                    variant="outlined"
                    v-model="newProfile.features"
                  >
                  </v-textarea>
                </v-col>
                <v-col cols="6">
                  <v-textarea
                    label="Accessories"
                    variant="outlined"
                    v-model="newProfile.accessories"
                    prepend-icon="mdi-headphones"
                  >
                  </v-textarea>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Warranty Description"
                    prepend-icon="mdi-note"
                    variant="outlined"
                    v-model="newProfile.warrantyDescription"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    label="Warrany Notes"
                    prepend-icon="mdi-note"
                    variant="outlined"
                    v-model="newProfile.warrantyNotes"
                    :rules="[rules.maxNotesLength]"
                  ></v-textarea>
                </v-col>
                <v-col>
                  <v-date-input
                    v-model="rawWarrStartDate"
                    clearable
                    label="Warranty Start Date"
                    variant="outlined"
                    color="blue"
                  ></v-date-input>
                </v-col>
                <v-col>
                  <v-date-input
                    v-model="rawWarrEndDate"
                    clearable
                    label="Warranty End Date"
                    variant="outlined"
                    color="blue"
                  ></v-date-input>
                </v-col>
              </v-row>
            </v-col>
            <template v-for="(field, index) in customFields" :key="index">
              <v-col cols="4" v-if="field.type === 'List'">
                <v-combobox
                  v-model="field.value"
                  :label="field.name"
                  :items="field.listValues"
                  item-title="value"
                  item-value="value"
                  :rules="field.required ? [rules.required] : []"
                  variant="outlined"
                  prepend-icon="field"
                  :return-object="false"
                  @update:modelValue="changeFieldValue(field)"
                ></v-combobox>
              </v-col>
              <v-col cols="4" v-else-if="field.type === 'String'">
                <v-text-field
                  v-model="field.value"
                  :label="field.name"
                  :rules="field.required ? [rules.required] : []"
                  variant="outlined"
                  prepend-icon="field"
                  :return-object="false"
                  @update:modelValue="changeFieldValue(field)"
                ></v-text-field>
              </v-col>
              <v-col cols="4" v-else-if="field.type === 'Integer'">
                <v-text-field
                  v-model="field.value"
                  :label="field.name"
                  :rules="
                    field.required ? [rules.required, intTest] : [intTest]
                  "
                  variant="outlined"
                  prepend-icon="field"
                  :return-object="false"
                  @input="filterIntegerInput"
                  @update:modelValue="changeFieldValue(field)"
                ></v-text-field>
              </v-col>
              <v-col cols="4" v-else-if="field.type === 'Decimal'">
                <v-text-field
                  v-model="field.value"
                  :label="field.name"
                  :rules="
                    field.required ? [rules.required, decTest] : [decTest]
                  "
                  variant="outlined"
                  prepend-icon="field"
                  :return-object="false"
                  @input="filterDecimalInput"
                  @update:modelValue="changeFieldValue(field)"
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
                @update:modelValue="changeProfileInfo"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="cancelgrey" text @click="emitCloseDialog">Cancel</v-btn>
      <v-btn color="saveblue" @click="saveProfile" :disabled="!validProfile"
        >Save</v-btn
      >
    </v-card-actions>
  </v-card>
</template>
<style scoped>
.relative-container {
  position: relative;
}
</style>

<!-- Love, "Zane" and Jaxen-->
