<script setup>
import PersonServices from "../services/personServices";
import RoomServices from "../services/roomServices";
import RoomServices from "../services/roomServices";
import { ref, onMounted, watch, computed } from "vue";
import router from "../router";
import { useStore } from "vuex";
import { formatInTimeZone } from "date-fns-tz";

const message = ref("");
const messageText = ref("");
const selectedTab = ref("People");
const selectedStatus = ref("Active");
const people = ref([]);
const rooms = ref([]);
const rooms = ref([]);
const showAddPersonDialog = ref(false);
const editingPerson = ref(false);
const originalPerson = ref({});
const validPerson = ref(false);
const showArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const itemToArchive = ref(null);
const itemToActivate = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const personSortBy = ref([{ key: "fName", order: "asc" }]);
const searchQuery = ref("");
const store = useStore();
const canAdd = computed(() => {
  return store.getters.canAdd;
});
const pattern = /^[a-zA-Z]+(?:\.[a-zA-Z]+)?@(?:eagles\.)?oc\.edu$/;
const rules = {
  required: (value) => !!value || "Required.",
  maxNameLength: (value) =>
    value == null || value.length <= 40 || "Name cannot exceed 40 characters",
  maxCounter: (value) =>
    value == null || value.length <= 7 || "ID number must be 7 numbers long",
  minCounter: (value) =>
    value == null || value.length >= 7 || "ID number must be 7 numbers long",
  idNumber: (value) =>
    /^[0-9]{7}$/.test(value) || "ID number must contain only numbers",
  email: (value) => {
    return pattern.test(value) || "e-mail must be eagles.oc.edu or oc.edu.";
  },
};
const newPerson = ref({
  formatInTimeZone: "",
  lName: "",
  email: "",
  idNumber: "",
  roomId: null,
  roomId: null,
});

// People Section

// Retrieve People from Database

const retrievePeople = async () => {
  try {
    const response = await PersonServices.getAll();
    people.value = response.data.map((person) => ({
      fName: person.fName,
      key: person.personId,
      lName: person.lName,
      email: person.email,
      idNumber: person.idNumber,
      roomId: person.roomId,
      roomId: person.roomId,
      activeStatus: person.activeStatus,
    }));
  } catch (error) {
    console.error("Error loading people:", error);
  }
};

const retrieveRooms = async () => {
  try {
    const response = await RoomServices.getAll();
    rooms.value = response.data || [];
    rooms.value.forEach((room) => {
      room.roomName =
        room.building.abbreviation +
        "-" +
        room.roomNo +
        " " +
        room.building.name;
    });
  } catch (error) {
    console.error("Error loading rooms:", error);
  }
};

const getOCPerson = async () => {
  let roomNumber = "";

  messageText.value = "";

  if (newPerson.value.idNumber != null && newPerson.value.idNumber != "") {
    let idNumber = newPerson.value.idNumber;
    let roomNumber = newPerson.value.roomNo;
    let roomId = null;
    try {
      const response = await PersonServices.getOCPersonById(idNumber);
      roomNumber = response.data.OfficeNumber;
      if (roomNumber != null && roomNumber != "") {
        const roomResponse = await RoomServices.getByBldRoomNumber(roomNumber);
        roomId = roomResponse.data.roomId;
      }
      newPerson.value = {
        fName: response.data.FirstName,
        lName: response.data.LastName,
        email: response.data.Email,
        idNumber: response.data.UserID,
        roomId: roomId,
      };
    } catch (error) {
      messageText.value = "OC Person data not found";
    }
  } else if (newPerson.value.email != null && newPerson.value.email != "") {
    let email = newPerson.value.email;
    let roomId = null;
    try {
      const response = await PersonServices.getOCPersonByEmail(email);
      roomNumber = response.data.OfficeNumber;
      if (roomNumber != null && roomNumber != "") {
        const roomResponse = await RoomServices.getByBldRoomNumber(roomNumber);
        if (roomResponse.data.length > 0) {
          roomId = roomResponse.data[0].roomId;
        }
      }

      newPerson.value = {
        fName: response.data.FirstName,
        lName: response.data.LastName,
        email: response.data.Email,
        idNumber: response.data.UserID,
        roomId: roomId,
      };
      if (roomNumber != null && roomId == null) {
        messageText.value =
          "Asset Sytem does not have  room number " +
          roomNumber +
          " in the database. Please add the room number first";
      }
    } catch (error) {
      messageText.value = "OC Person data not found";
    }
  }
};

const editPerson = async (person) => {
  newPerson.value = {
    fullName: `${person.fName} ${person.lName}`,
    fName: person.fName,
    lName: person.lName,
    email: person.email,
    idNumber: person.idNumber,
    personId: person.key,
    roomId: person.roomId,
    roomId: person.roomId,
  };
  editingPerson.value = true;
  showAddPersonDialog.value = true;
  originalPerson.value = { ...newPerson.value }; // Capture the original state
};

const savePerson = async () => {
  const personData = {
    fName: newPerson.value.fName,
    lName: newPerson.value.lName,
    email: newPerson.value.email,
    idNumber: newPerson.value.idNumber,
    roomId: newPerson.value.roomId,
    roomId: newPerson.value.roomId,
  };

  try {
    let response;
    if (editingPerson.value) {
      // Assuming your API expects an ID and the updated data for people updates
      response = await PersonServices.update(
        newPerson.value.personId,
        personData
      );
      snackbarText.value = "Person updated successfully.";
    } else {
      response = await PersonServices.create(personData);
      snackbarText.value = "Person added successfully.";
    }

    snackbar.value = true; // Show the snackbar
    editingPerson.value = false;
    showAddPersonDialog.value = false;
    newPerson.value = { fName: "", lName: "", email: "", idNumber: "" }; // Reset the form
    await retrievePeople(); // Refresh people list
  } catch (error) {
    console.error("Error saving person:", error);
    messageText.value = `Error saving person: ${
      error.message || "Unknown error"
    }`;
  }
};

const closePersonDialog = () => {
  showAddPersonDialog.value = false;
  editingPerson.value = false;
  newPerson.value = { fName: "", lName: "", email: "", idNumber: "" };
};

const archivePerson = async (personId) => {
  const archiveData = {
    activeStatus: false, // The new value for the activeStatus field
  };
  try {
    await PersonServices.update(personId, archiveData);
    snackbarText.value = "Person archived successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of people after successful deletion
    retrievePeople();
    people.value = people.value.filter((c) => c.id !== personId);
  } catch (error) {
    console.error(error);
    message.value = "Error archiving person.";
  }
};

const activatePerson = async (personId) => {
  const activateData = {
    activeStatus: true, // The new value for the activeStatus field
  };
  try {
    await PersonServices.update(personId, activateData);
    snackbarText.value = "Person activated successfully.";
    snackbar.value = true; // Show the snackbar
    // Refresh the list of people after successful deletion
    await retrievePeople();
    people.value = people.value.filter((c) => c.id !== personId);
  } catch (error) {
    console.error(error);
    message.value = "Error activating person.";
  }
};

const basePersonHeaders = ref([
  { title: "Full Name", key: "fullName" },
  { title: "Email", key: "email" },
  { title: "ID", key: "idNumber" },
  { title: "View Person Details", key: "view" },
]);

const personHeaders = computed(() => {
  const headers = [...basePersonHeaders.value];

  if (store.getters.canEdit) {
    headers.push({ title: "Edit", key: "edit", sortable: false });
  }

  if (store.getters.canArchive) {
    headers.push({ title: "Archive", key: "archive", sortable: false });
  }

  return headers;
});

const archivedPersonHeaders = computed(() => {
  const headers = [...basePersonHeaders.value];

  if (store.getters.canActivate) {
    headers.push({ title: "Activate", key: "activate", sortable: false });
  }

  return headers;
});

const filteredPeople = computed(() => {
  let result = people.value;

  // Filter by active/archived status
  if (selectedStatus.value === "Active") {
    result = result.filter((person) => person.activeStatus === true);
  } else if (selectedStatus.value === "Archived") {
    result = result.filter((person) => person.activeStatus === false);
  }

  // Further filter by search query
  if (searchQuery.value) {
    const lowerSearchQuery = searchQuery.value.toLowerCase();

    result = result.filter(
      (person) =>
        `${person.fName} ${person.lName}`
          .toLowerCase()
          .includes(lowerSearchQuery) ||
        person.idNumber.toLowerCase().includes(lowerSearchQuery) // Include ID in the search
    );
  }

  return result;
});

const highlightText = (text) => {
  if (!text) return ""; // Return empty string if text is null or undefined
  const lowerSearchQuery = searchQuery.value
    ? searchQuery.value.toLowerCase()
    : "";

  if (!lowerSearchQuery) return text; // No query, return original text

  const regex = new RegExp(`(${lowerSearchQuery})`, "gi");
  return text.replace(regex, '<mark class="custom-highlight">$1</mark>'); // Apply custom highlight
};

const hasPersonChanged = computed(() => {
  return (
    newPerson.value.title !== originalPerson.value.title ||
    newPerson.value.lName !== originalPerson.value.lName ||
    newPerson.value.email !== originalPerson.value.email ||
    newPerson.value.idNumber !== originalPerson.value.idNumber ||
    newPerson.value.roomId !== originalPerson.value.roomId
  );
});
const highlightedPeople = computed(() => {
  const lowerSearchQuery = searchQuery.value
    ? searchQuery.value.toLowerCase()
    : ""; // Handle null/empty cases

  return filteredPeople.value.map((person) => {
    const fName = person.fName || ""; // Default to empty string if null
    const lName = person.lName || "";
    const idNumber = person.idNumber || "";

    return {
      ...person,
      fullName: `${highlightText(fName)} ${highlightText(lName)}`, // Ensure null-safe operation
      idNumber: highlightText(idNumber),
    };
  });
});

const scrollToPerson = () => {
  const searchLower = searchQuery.value.toLowerCase();
  const matchedPerson = filteredPeople.value.find((person) =>
    `${person.fName} ${person.lName}`.toLowerCase().includes(searchLower)
  );

  if (matchedPerson) {
    const selector = `[data-person-id="${matchedPerson.key}"]`;
    const personElement = document.querySelector(selector);
    if (personElement) {
      personElement.scrollIntoView({ behavior: "smooth" });
    }
  }
};

// Misc Section

function viewPerson(personId) {
  router.push({ name: "personView", params: { personId: personId } });
}

const openArchiveDialog = (item) => {
  itemToArchive.value = item;
  showArchiveDialog.value = true;
};

const confirmArchive = async () => {
  if (itemToArchive.value.type === "person") {
    await archivePerson(itemToArchive.value.id);
  }
  showArchiveDialog.value = false;
  itemToArchive.value = null; // Reset after deletion
};

const openActivateDialog = (item) => {
  itemToActivate.value = item;
  showActivateDialog.value = true;
};

const confirmActivate = async () => {
  if (itemToActivate.value.type === "person") {
    await activatePerson(itemToActivate.value.id);
  }
  showActivateDialog.value = false;
  itemToActivate.value = null; // Reset after deletion
};

// Watch for changes on selectedTab and fetch data accordingly
watch(selectedTab, (newValue) => {
  if (newValue === "People") {
    retrievePeople();
  }
});

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrievePeople();
  await retrieveRooms();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title>Person Management </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="selectedTab" background-color="primary" dark>
            <v-tab value="People" color="primary">
              <v-icon left class="mr-2">mdi-account-multiple</v-icon>
              People
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="4">
          <v-tabs
            v-model="selectedStatus"
            background-color="primary"
            dark
            class="mb-1"
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
        <v-col cols="12" md="8">
          <v-text-field
            v-model="searchQuery"
            label="Search by Name or ID"
            variant="outlined"
            dense
            clearable
            @input="scrollToPerson"
            class="pt-0"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Active People Section -->
            <div v-if="selectedTab === 'People' && selectedStatus === 'Active'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Active People</span>
                  <template v-if="canAdd">
                    <v-btn
                      color="primary"
                      class="ma-2"
                      @click="showAddPersonDialog = true"
                    >
                      Add New Person
                    </v-btn>
                  </template>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="personHeaders"
                    :items="highlightedPeople"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="personSortBy"
                  >
                    <template v-slot:item.fullName="{ item }">
                      <span v-html="item.fullName"></span>
                      <!-- Displaying the full name with highlights -->
                    </template>
                    <template v-slot:item.idNumber="{ item }">
                      <span v-html="item.idNumber"></span>
                      <!-- Displaying the ID with highlights -->
                    </template>
                    <template v-slot:item.view="{ item }">
                      <div
                        class="d-flex align-center justify-start"
                        style="padding-left: 10%"
                      >
                        <v-btn
                          icon
                          class="table-icons"
                          @click="viewPerson(item.key)"
                        >
                          <v-icon>mdi-eye</v-icon>
                        </v-btn>
                      </div>
                    </template>

                    <template v-slot:item.edit="{ item }">
                      <v-btn icon class="table-icons" @click="editPerson(item)">
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
                            type: 'person',
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
            <!-- Archived People Section -->
            <div
              v-if="selectedTab === 'People' && selectedStatus === 'Archived'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Archived People</span>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="archivedPersonHeaders"
                    :items="highlightedPeople"
                    item-key="key"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="personSortBy"
                  >
                    <template v-slot:item.fullName="{ item }">
                      <span v-html="item.fullName"></span>
                      <!-- Displaying the full name with highlights -->
                    </template>
                    <template v-slot:item.idNumber="{ item }">
                      <span v-html="item.idNumber"></span>
                      <!-- Displaying the ID with highlights -->
                    </template>
                    <template v-slot:item.view="{ item }">
                      <div
                        class="d-flex align-center justify-start"
                        style="padding-left: 10%"
                      >
                        <v-btn
                          icon
                          class="table-icons"
                          @click="viewPerson(item.key)"
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
                            type: 'person',
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

    <!-- Add/Edit Person Dialog -->
    <v-dialog v-model="showAddPersonDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline"
            >{{ editingPerson ? "Edit" : "Add" }} Person</span
          >
        </v-card-title>
        <v-card-subtitle v-if="!editingPerson"
          >Enter Email or Id and click GET OC DATA to load current
          info</v-card-subtitle
        >

        <v-card-text>
          <v-form ref="formPerson" v-model="validPerson">
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    label="First Name"
                    variant="outlined"
                    v-model="newPerson.fName"
                    :rules="[rules.required, rules.maxNameLength]"
                    maxlength="40"
                    counter
                    :disabled="editingPerson"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Last Name"
                    variant="outlined"
                    v-model="newPerson.lName"
                    :rules="[rules.required, rules.maxNameLength]"
                    maxlength="40"
                    counter
                    :disabled="editingPerson"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="Email"
                    variant="outlined"
                    v-model="newPerson.email"
                    placeholder="first.last@oc.edu or first.last@eagles.oc.edu"
                    :rules="[rules.require, rules.email]"
                    maxlength="40"
                    counter
                    prepend-icon="mdi-email"
                    :disabled="editingPerson"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    label="ID No."
                    variant="outlined"
                    v-model="newPerson.idNumber"
                    hint="Please enter your 7 digit ID number"
                    :rules="[
                      rules.required,
                      rules.maxCounter,
                      rules.minCounter,
                      rules.idNumber,
                    ]"
                    maxlength="7"
                    counter
                    prepend-icon="mdi-pound"
                    :disabled="editingPerson"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-select
                    label="Office/Room"
                    variant="outlined"
                    v-model="newPerson.roomId"
                    item-title="roomName"
                    item-value="roomId"
                    :return-object="false"
                    :items="rooms"
                    prepend-icon="mdi-office-building"
                    clearable
                  ></v-select>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-text class="text-red text-right ma-0">
          {{ messageText }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green" @click="getOCPerson">Get OC Data</v-btn>
          <v-btn color="cancelgrey" text @click="closePersonDialog"
            >Cancel</v-btn
          >
          <v-btn
            color="saveblue"
            @click="savePerson"
            :disabled="!validPerson || !hasPersonChanged"
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
          >Are you sure you want to archive this person?
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
          >Confirm Activate</v-card-title
        >
        <v-card-text
          >Are you sure you want to activate this person?
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
