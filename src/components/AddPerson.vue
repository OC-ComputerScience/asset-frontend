<script setup>
import { ref } from "vue";
import PersonServices from "../services/personServices.js";
import RoomServices from "../services/roomServices.js";

const message = ref(null);
const messageText = ref(null);
const newPerson = ref({});
const idNumber = ref(null);
const email = ref(null);

const emit = defineEmits(["savePerson", "closeDialog"]);

const getOCPerson = async () => {
  message.value = "";
  messageText.value = "";
  newPerson.value = null;
  let roomNumber = "";

  if (idNumber.value != null && idNumber.value != "") {
    try {
      const response = await PersonServices.getOCPersonById(idNumber.value);
      if (response.data.Success == "False") {
        messageText.value = "No person found with that ID number.";
        return;
      }
      roomNumber = response.data.OfficeNumber;

      let roomId = null;
      if (roomNumber != null && roomNumber.length > 4) {
        const roomResponse = await RoomServices.getByBldRoomNumber(roomNumber);
        if (roomResponse.data.length > 0) roomId = roomResponse.data[0].roomId;
        else {
          messageText.value =
            "No room found with that room number " +
            roomNumber +
            ". Please add room first";
        }
        roomId = roomResponse.data.roomId;
      }

      newPerson.value = {
        fName: response.data.FirstName,
        lName: response.data.LastName,
        email: response.data.Email,
        idNumber: response.data.UserID,
        roomId: roomId,
        roomNumber: roomNumber,
      };
    } catch (error) {
      console.error("Error loading OC person data:", error);
      messageText.value = "Failed to load OC person data.";
    }
  } else if (email.value != null && email.value != "") {
    try {
      const response = await PersonServices.getOCPersonByEmail(email.value);
      if (response.data.Success == "False") {
        messageText.value = "No person found with that email.";
        return;
      }
      roomNumber = response.data.OfficeNumber;

      let roomId = null;
      if (roomNumber != null && roomNumber.length > 4) {
        await RoomServices.getByBldRoomNumber(roomNumber).then(
          (roomResponse) => {
            if (roomResponse.data.length > 0)
              roomId = roomResponse.data[0].roomId;
            else {
              messageText.value =
                "No room found with that room number " +
                roomNumber +
                ". Please add room first";
            }
          }
        );
      }

      newPerson.value = {
        fName: response.data.FirstName,
        lName: response.data.LastName,
        email: response.data.Email,
        idNumber: response.data.UserID,
        roomId: roomId,
        roomNumber: roomNumber,
      };
    } catch (error) {
      console.error("Error loading OC person data:", error);
      messageText.value = "Failed to load OC person data.";
    }
  }
};

const saveNewPerson = async () => {
  let responseText;
  let person = null;
  try {
    let response = await PersonServices.create(newPerson.value);
    person = response.data;
    responseText = "Person added successfully.";
  } catch (err) {
    console.error(err);
    responseText = "Failed to add the person.";
  } finally {
    emit("savePerson", person, responseText);
  }
};
</script>

<template>
  <div>
    <v-card class="rounded-xl">
      <v-card-title class="justify-space-between">
        <span class="headline">Add New Person</span>
      </v-card-title>
      <v-form ref="personAddForm">
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="idNumber"
                label="OC Id Number"
                variant="outlined"
                prepend-icon="mdi-account"
                clearable
              ></v-text-field>
              OR
              <v-text-field
                v-model="email"
                label="OC Email"
                variant="outlined"
                prepend-icon="mdi-account"
                clearable
              ></v-text-field>
            </v-col>
          </v-row>
          <div v-if="newPerson != null">
            <v-row class="ml-10" v-if="newPerson.idNumber"> Found: </v-row>
            <v-row class="ml-16">
              {{ newPerson.idNumber }}
            </v-row>
            <v-row class="ml-16">
              {{ newPerson.fName }}
              {{ newPerson.lName }}
            </v-row>
            <v-row class="ml-16">
              {{ newPerson.email }}
            </v-row>
            <v-row class="ml-16">
              {{ newPerson.roomNumber }}
            </v-row>
          </div>
          <div class="ml-10" v-if="message != ''">
            {{ message }}
          </div>
        </v-card-text>
        <v-card-text v-if="messageText" class="text-red text-right">
          {{ messageText }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green" class="ma-2" text @click="getOCPerson"
            >Get OC Info</v-btn
          >
          <v-btn color="cancelgrey" text @click="$emit('closeDialog')"
            >Cancel</v-btn
          >
          <v-btn
            color="saveblue"
            class="ma-2"
            text
            @click="saveNewPerson"
            :disabled="newPerson == null"
            >Save New Person</v-btn
          >
        </v-card-actions>
      </v-form>
    </v-card>
  </div>
</template>
