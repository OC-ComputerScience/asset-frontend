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
const menu = ref(false);
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
  event.target.value = value.replace(/[^\d-]/g, '');
};
const filterDecimalInput = (event) => {
  const value = event.target.value;
  event.target.value = value.replace(/[^0-9.-]/g, '').replace(/(\..*?)\..*/g, '$1').replace(/(\-.*?)-.*/g, '$1');
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
    required: true
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
});

const changeProfileInfo = () => {
  profileInfoChanged.value = true;
}

// When you load the profile for editing, store the initial state
const loadProfileForEditing = async (profile) => {
  selectedTypeId.value = profile.typeId;
  await retrieveCustomFields(selectedTypeId.value);
  if (profile.profileId) {
    await retrieveFieldValues(profile.profileId);
  }

  // Correctly assign `rawAcquisitionDate`
  if (profile.acquisitionDate) {
    rawAcquisitionDate.value = parseISO(profile.acquisitionDate);
  } else {
    rawAcquisitionDate.value = null; // Fallback if there's no acquisition date
  }

  // Correctly set `selectedTypeId`

  // Update `originalProfile` for comparison
  originalProfile.value = {
    profileName: profile.profileName,
    typeId: profile.typeId,
    purchasePrice: profile.purchasePrice,
    acquisitionDate: profile.acquisitionDate,
    notes: profile.notes,
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
    }));
  } catch (error) {
    console.error("Error loading types:", error);
    message.value = "Failed to load types.";
  }
};

const retrieveCustomFields = async(typeId) => {
  try{
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
        value: '',
        profileDataId: null,
        listValues: {},
        sequence: field.sequence,
        changed: false
      };

      if (newField.type === 'List') {
        let data = await customFieldValueServices.getAllForField(newField.customFieldId);
        newField.listValues = data.data;
      }
      return newField;
    });

    let customFieldsArray = await Promise.all(customFieldPromises);
    customFields.value.push(...customFieldsArray);
  }
  catch(err){
    console.error(err);
  }
}

const retrieveFieldValues = async(profileId) => {
   let response = await profileDataServices.getByProfileId(profileId);
   let profileData = response.data;
   profileData.forEach(profile => {
    let customField = customFields.value.find(field => field.customFieldId === profile.customFieldValue.customFieldId);
    customField.value = profile.customFieldValue.value;
    customField.fieldValueId = profile.fieldValueId;
    customField.profileDataId = profile.profileDataId;
    if(customField.sequence){
      titleArray.value[customField.sequence - 1] = customField.value;
    }
   })
};

const changeFieldValue = (field) => {
  field.changed = true;
  if(field.type == 'List'){
    let newValue = field.listValues.find(listValue => listValue.value === field.value);
    if(newValue){
      field.fieldValueId = newValue.id;
    }
    else field.fieldValueId = null;
    
  }
  updateTitle(field.value, field.sequence);
}

const updateTitle = (value, sequence) => {
  if(sequence > 0 && !overrideTitle.value) {
    titleArray.value[sequence - 1] = value;
    newProfile.value.profileName = titleArray.value.join(' ');
  }
}

// Save profile (add or edit)
const saveProfile = async () => {
  const purchasePrice = newProfile.value.purchasePrice.replace(/[$,]/g, "");

  let formattedAcquisitionDate = null;
  formattedAcquisitionDate = format(
    new Date(rawAcquisitionDate.value),
    "yyyy-MM-dd"
  );

  const profilePayload = {
    profileName: newProfile.value.profileName,
    notes: newProfile.value.notes,
    purchasePrice: purchasePrice,
    acquisitionDate: formattedAcquisitionDate,
    typeId: selectedTypeId.value.typeId,
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

const saveFieldValues = async(profileId) => {
  for(let field of customFields.value){
    if(field.changed){
      let fieldValueId;
      let data = {
            customFieldId: field.customFieldId,
            value: field.value 
          };
      try{
        if(field.fieldValueId && field.type != 'List'){
          fieldValueId = field.fieldValueId;
          await customFieldValueServices.update(fieldValueId, data);
        }
        else if(field.fieldValueId && field.type == 'List'){
          let newFieldValue = {fieldValueId: field.fieldValueId};
          await profileDataServices.update(field.profileDataId, newFieldValue);
        }
        else{
          let response = await customFieldValueServices.create(data);
          fieldValueId = response.data.id;
          let profileData = {
            profileId: profileId,
            fieldValueId: fieldValueId
          };
          await profileDataServices.create(profileData);
        }
      }
      catch(err){
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
  if(dataLoaded.value){
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

      if (newValue.typeId) {
        selectedTypeId.value = newValue.typeId; // Update `selectedTypeId`
      }

      if (newValue.acquisitionDate) {
        rawAcquisitionDate.value = parseISO(newValue.acquisitionDate); // Update date
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
      <span class="headline"
        >{{ editMode ? "Edit" : "Add" }} Profile</span
      >
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
                    prepend-icon="mdi-devices"
                    @update:modelValue = changeProfileInfo
                  ></v-autocomplete>
                </v-col>
                <v-col cols="7">
                  <v-text-field
                    label="Profile Name"
                    variant="outlined"
                    v-model="newProfile.profileName"
                    :rules="[rules.required, rules.maxFieldLength]"
                    maxlength="50"
                    counter
                    prepend-icon="mdi-rename"
                    :disabled="!overrideTitle"
                    @update:modelValue = changeProfileInfo
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
                    @update:modelValue = changeProfileInfo
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
                        @update:modelValue = changeProfileInfo
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="rawAcquisitionDate"
                      @input="menu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
              </v-row>
            </v-col>
            <template
              v-for="(field, index) in customFields"
              :key="index"
            >
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
                  :rules="field.required ? [rules.required, intTest] : [intTest]"
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
                  :rules="field.required ? [rules.required, decTest] : [decTest]"
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
                @update:modelValue = changeProfileInfo
              ></v-textarea>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="cancelgrey" text @click="emitCloseDialog">Cancel</v-btn>
      <v-btn color="saveblue" @click="saveProfile" :disabled="!validProfile">Save</v-btn>
    </v-card-actions>
  </v-card>
</template>

<!-- Love, "Zane" and Jaxen-->
