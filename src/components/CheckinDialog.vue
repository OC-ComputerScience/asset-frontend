<script setup>
import { ref, computed, onMounted } from "vue";
import assignmentServices from "../services/assignment.services.js";
import { format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import serializedAssetServices from "../services/serializedAssetServices";
import store from "../store/store.js";
import NotificationSender from "../components/NotificationSender.vue";


const props = defineProps(["assignee", "activeCheckin", "checkouts", "editMode"]);
const emit = defineEmits(["saveCheckin", "cancelCheckin"]);

const availableCheckins = ref([]);
const activeCheckin = ref(null);
const checkinFormValid = ref(false);
const checkinNote = ref("");
const oldNote = ref("");
const loginUser = computed(() => store.getters.getLoginUserInfo);
const currentUser = `${loginUser.value.fName} ${loginUser.value.lName}`;
const notificationSender = ref(null);

const hasNoteChanged = computed(() => {
    return checkinNote.value !== oldNote.value;
})

const isFormValid = computed(() => {
    return props.editMode ? hasNoteChanged.value : checkinFormValid.value;
})

const rules = {
    required: (value) => !!value || "Required.",
    maxNotesLength: (value) => value === null || value.length <= 255,
};

onMounted(async() => {
    if(!props.activeCheckin){
        availableCheckins.value = props.checkouts;
        availableCheckins.value.forEach((asset) => {
          makeTitle(asset);
        })
    }
    else{
        activeCheckin.value = props.activeCheckin;
        makeTitle(activeCheckin.value);
        oldNote.value = activeCheckin.value.checkinNote;
        checkinNote.value = activeCheckin.value.checkinNote;
    }
})

const makeTitle = (asset) => {
  let title = "";
  if(props.assignee === "People") title += asset.person.fullNameWithId;
  else if(props.assignee === "Buildings") title += asset.building.name;
  else if(props.assignee === "Rooms") title += asset.room.roomName;
  title += `: ${asset.serializedAsset.serializedAssetName}`;
  asset.title = title;
}

const convertToUtcForStorage = (localDate) => {
    const timeZone = "America/Chicago"; 
    return zonedTimeToUtc(localDate, timeZone);
}

const saveCheckin = async() => {
    let responseText;
    const checkinDateUtc = convertToUtcForStorage(new Date());
    const formattedCheckinDate = format(
        checkinDateUtc,
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
    );

    let checkinData = {
        checkoutStatus: 0,
        checkinDate: formattedCheckinDate,
        checkinNote: checkinNote.value ?? null,
        checkedInBy: currentUser
    };

    let key;
    if(props.assignee === "People") key = activeCheckin.value.personAssetId;
    else if(props.assignee === "Buildings") key = activeCheckin.value.buildingAssetId;
    else if(props.assignee === "Rooms") key = activeCheckin.value.roomAssetId;

    try{
        await assignmentServices.update(props.assignee, key, checkinData);
        if(!props.activeCheckin){
          await serializedAssetServices.updateCheckoutStatus(activeCheckin.value.serializedAssetId, false);
          if(props.assignee === 'People'){
            notificationSender.value.sendEmail(
              {
                to: activeCheckin.value.person.email,
                fullName: activeCheckin.value.person.fullNameWithId,
                checkinDate: formattedCheckinDate,
                serializedAssetName: activeCheckin.value.serializedAsset.serializedAssetName
              },
              "receipt"
            );

          }
          responseText = "Asset checked in successfully.";
        }else{
          responseText = "Checkin updated successfully.";
        }

    }
    catch(err){
        console.error(err);
        responseText = "Some Error occureed. Please try again later.";
    }
    finally{
        emit("saveCheckin", responseText);
    }
}

</script>

<template>
<div>
  <v-card class="pa-4 rounded-xl">
      <v-card-title>
        <span class="headline">Check-in Asset</span>
      </v-card-title>
      <v-form ref="checkinForm" v-model="checkinFormValid">
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  label="Select Asset for Check-in"
                  v-model="activeCheckin"
                  :items="availableCheckins"
                  variant="outlined"
                  item-title="title"
                  item-value="key"
                  :rules="[rules.required]"
                  return-object
                  clearable
                  prepend-icon="mdi-cellphone-settings"
                  :disabled="props.activeCheckin !== null"
                ></v-autocomplete>
              </v-col>
              <v-col cols="12" v-if="activeCheckin">
                <v-textarea
                  label="Notes"
                  variant="outlined"
                  v-model="checkinNote"
                  :rules="[rules.maxNotesLength]"
                  maxlength="255"
                  :counter="255"
                  prepend-icon="mdi-note"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="$emit('cancelCheckin')"
            >Cancel</v-btn
          >
          <v-btn
            color="saveblue"
            class="ma-2"
            text
            @click="saveCheckin"
            :disabled="!isFormValid"
            >Check-in</v-btn
          >
        </v-card-actions>
      </v-form>
    </v-card>
    <NotificationSender ref="notificationSender" />
</div>
</template>