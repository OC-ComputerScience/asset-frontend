<script setup>
import SerializedAssetServices from "../services/serializedAssetServices";
import BuildingAssetServices from "../services/buildingAssetServices";
import RoomAssetServices from "../services/roomAssetServices";
import PersonAssetServices from "../services/personAssetServices";
import AssetProfileServices from "../services/assetProfileServices";
import LogServices from "../services/logServices";
import WarrantyServices from "../services/warrantyServices";
import BarcodeServices from "../services/barcodeServices";
import LeaseServices from "../services/leaseServices";
import { ref, onMounted, watch, defineProps, computed } from "vue";
import router from "../router";
import { useStore } from "vuex";
import moment from "moment-timezone";
import { useRoute } from "vue-router";

const route = useRoute();
const sourcePage = route.query.sourcePage;
const fullAssetHistory = ref([]);
const selectedTab = ref("History");
const maintenanceLogs = ref([]);
const warranties = ref([]);
const barcodes = ref([]);
const leases = ref([]);
const message = ref("");
const itemToDisplay = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const showNotesDialog = ref(false);
const store = useStore();
const assignmentSortBy = ref([{ key: "checkoutDate", order: "desc" }]);
const maintenanceSortBy = ref([{ key: "serviceDate", order: "desc" }]);
const warrantiesSortBy = ref([{ key: "endDate", order: "desc" }]);
const leasesSortBy = ref([{ key: "endDate", order: "desc" }]);
const customFields = ref([]);
const profileData = ref([]);
const profileDetails = ref({});

const rules = {
  required: (value) => !!value || "Required.",
};

const props = defineProps({
  serializedAssetId: {
    required: true,
  },
  personId: {
    required: false,
  },
});

const retrieveAllAssetHistories = async () => {
  try {
    const buildingResponse =
      await BuildingAssetServices.getBuildingAssetsBySerializedAssetId(
        props.serializedAssetId
      );
    const roomResponse =
      await RoomAssetServices.getRoomAssetsBySerializedAssetId(
        props.serializedAssetId
      );
    const personResponse =
      await PersonAssetServices.getPersonAssetsBySerializedAssetId(
        props.serializedAssetId
      );

    const buildingAssetHistory = buildingResponse.data.map((buildingAsset) => ({
      type: "Building",
      key: buildingAsset.buildingAssetId,
      name: buildingAsset.building.name,
      checkoutDate: buildingAsset.checkoutDate,
      checkedOutBy: buildingAsset.checkedOutBy,
      checkinDate: buildingAsset.checkinDate,
      checkedInBy: buildingAsset.checkedInBy,
    }));

    const roomAssetHistory = roomResponse.data.map((roomAsset) => ({
      type: "Room",
      key: roomAsset.roomAssetId,
      name:
        "Room " + roomAsset.room.roomNo + " - " + roomAsset.room.building.name,
      checkoutDate: roomAsset.checkoutDate,
      checkedOutBy: roomAsset.checkedOutBy,
      checkinDate: roomAsset.checkinDate,
      checkedInBy: roomAsset.checkedInBy,
    }));

    const personAssetHistory = personResponse.data.map((personAsset) => ({
      type: "Person",
      key: personAsset.personAssetId,
      name: personAsset.person.fName + " " + personAsset.person.lName,
      checkoutDate: personAsset.checkoutDate,
      checkedOutBy: personAsset.checkedOutBy,
      checkinDate: personAsset.checkinDate,
      checkedInBy: personAsset.checkedInBy,
    }));

    const combinedHistory = [
      ...buildingAssetHistory,
      ...roomAssetHistory,
      ...personAssetHistory,
    ];
    return combinedHistory;
  } catch (error) {
    console.error("Error loading asset histories:", error);
    return [];
  }
};

const getAllAssetHistories = async () => {
  try {
    const allAssetHistories = await retrieveAllAssetHistories();
    fullAssetHistory.value = allAssetHistories; // Set the data to fullAssetHistory
  } catch (error) {
    console.error("Error retrieving all asset histories:", error);
  }
};

const assetHistoryHeaders = ref([
  { title: "Owner/Facility", key: "name" },
  { title: "Checkout Date", key: "checkoutDate" },
  { title: "Checked Out By", key: "checkedOutBy" },
  { title: "Checkin Date", key: "checkinDate" },
  { title: "Checked In by", key: "checkedInBy" },
]);

//Maintenance section

const retrieveLogsBySerializedAssetId = async () => {
  try {
    const response = await LogServices.getLogsBySerializedAssetId(
      props.serializedAssetId
    );
    maintenanceLogs.value = response.data;
  } catch (error) {
    console.error("Error loading maintenance logs:", error);
    message.value = "Failed to load maintenance logs.";
  }
};

const openShowNotesDialog = (item) => {
  itemToDisplay.value = item;
  showNotesDialog.value = true;
};

const maintenanceLogHeaders = ref([
  { title: "Service Date", key: "serviceDate" },
  { title: "Performed By", key: "performedBy" },
  { title: "Type", key: "type" },
  { title: "View Notes", key: "view" },
]);

//Warranties section

const retrieveWarrantiesBySerializedAssetId = async () => {
  try {
    const response = await WarrantyServices.getWarrantiesBySerializedAssetId(
      props.serializedAssetId
    );
    warranties.value = response.data;
  } catch (error) {
    console.error("Error loading maintenance logs:", error);
    message.value = "Failed to load maintenance logs.";
  }
};

const warrantyHeaders = ref([
  { title: "Warranty Desc", key: "warrantyDescription" },
  { title: "Length", key: "length" },
  { title: "Start Date", key: "startDate" },
  { title: "End Date", key: "endDate" },
  { title: "Status", key: "activeStatus" },
]);

//Warranties section

const retrieveBarcodesBySerializedAssetId = async () => {
  try {
    const response = await BarcodeServices.getBarcodesBySerializedAssetId(
      props.serializedAssetId
    );
    barcodes.value = response.data;
  } catch (error) {
    console.error("Error loading barcodes", error);
    message.value = "Failed to load barcodes.";
  }
};

const barcodeHeaders = ref([
  { title: "Type", key: "barcodeType" },
  { title: "Code", key: "barcode" },
]);

//Leases section

const retrieveLeasesBySerializedAssetId = async () => {
  try {
    const response = await LeaseServices.getLeasesBySerializedAssetId(
      props.serializedAssetId
    );
    leases.value = response.data;
  } catch (error) {
    console.error("Error loading leases:", error);
    message.value = "Failed to load leases.";
  }
};

const leaseHeaders = ref([
  { title: "Lessor", key: "lessor" },
  { title: "Length", key: "length" },
  { title: "Start Date", key: "startDate" },
  { title: "End Date", key: "endDate" },
  { title: "Status", key: "activeStatus" },
]);

// Misc Section

const fixProfileField = (profileField) => {
  let field = "";
  if (profileField != null && profileField === profileField.toUpperCase()) {
    return profileField;
  }
  if (profileField != null) {
    field = profileField.split(/(?=[A-Z])/);
    return field
      .map((field) => field.charAt(0).toUpperCase() + field.slice(1))
      .join(" ");
  }
  return field;
};

const assetDetails = ref({ serializedAssetName: "Loading..." });

const retrieveAssetDetails = async () => {
  try {
    const response = await SerializedAssetServices.getById(
      props.serializedAssetId
    );
    assetDetails.value = response.data;
  } catch (error) {
    console.error("Error loading asset details:", error);
    message.value = "Failed to load asset details.";
  }
};

const retrieveProfileData = async () => {
  try {
    await retrieveAssetDetails();
    const response = await AssetProfileServices.getById(
      assetDetails.value.profileId
    );
    profileDetails.value = response.data;
    profileData.value = response.data.profileData;
    profileData.value.sort((a, b) => {
      let avalue = a.customFieldValue.customField.customFieldTypes[0].sequence
        ? a.customFieldValue.customField.customFieldTypes[0].sequence
        : 100;
      let bvalue = b.customFieldValue.customField.customFieldTypes[0].sequence
        ? b.customFieldValue.customField.customFieldTypes[0].sequence
        : 100;
      return avalue - bvalue;
    });

    console.log("Profile Data", profileData.value);
  } catch (error) {
    console.error("Error loading profile details:", error);
    message.value = "Failed to load profile details.";
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY - h:mm A");
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
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

const formatWarranty = (dateString) => {
  return moment.utc(dateString).format("MMM DD, YYYY");
};
const formatCheckinDate = (dateString) => {
  if (!dateString) return "N/A";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY - h:mm A");
};

const formatCheckinPerson = (String) => {
  if (!String) return "N/A";
  return String;
};

const formatLength = (length) => {
  if (!length) return "N/A"; // Handle cases where length might be undefined or null
  return `${length} mo.`;
};
const formatStatus = (activeStatus) => {
  if (activeStatus === true) {
    return "Active";
  } else {
    return "Past";
  }
};

const goBack = () => {
  if (sourcePage === "profileView") {
    router.push({
      name: "profileView",
      params: { profileId: assetDetails.value.profileId },
    });
  } else if (sourcePage === "personView") {
    router.push({
      name: "personView",
      params: { personId: props.personId },
    });
  } else {
    router.push({ name: "assetManage" });
  }
};

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await retrieveProfileData();
  await retrieveAssetDetails();
  await getAllAssetHistories();
  await retrieveLogsBySerializedAssetId();
  await retrieveWarrantiesBySerializedAssetId();
  await retrieveLeasesBySerializedAssetId();
  await retrieveBarcodesBySerializedAssetId();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <!-- Header section with back button -->
        <v-toolbar color="background">
          <v-btn icon @click="goBack">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <v-toolbar-title>{{
            assetDetails.serializedAssetName
          }}</v-toolbar-title>
        </v-toolbar>
        <v-divider class="my-4"></v-divider>
        <v-row>
          <v-col cols="12" sm="6" md="4" v-for="data in profileData">
            <div class="asset-detail">
              <strong>{{ data.customFieldValue.customField.name }}</strong>
              <div>{{ data.customFieldValue.value }}</div>
            </div>
          </v-col>
        </v-row>
        <!-- Purchase Price and Acquisition Date -->
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <div class="asset-detail">
              <strong>Purchase Price</strong>
              <div>{{ formatCurrency(assetDetails.purchasePrice) }}</div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <div class="asset-detail">
              <strong>Acquisition Date</strong>
              <div>{{ formatDate(assetDetails.acquisitionDate) || "N/A" }}</div>
            </div>
          </v-col>

          <!-- Notes Section -->
          <v-col cols="12" sm="6" md="4">
            <div class="notes-section">
              <strong>Notes</strong>
              <div class="notes-data">
                {{ assetDetails.notes || "No notes available" }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Profile Details -->

        <div v-if="!assetDetails.activeStatus">
          <!-- Disposal Information if activeStatus is 0 -->
          <v-col cols="12" sm="6" md="3"></v-col>
          <v-toolbar color="background">
            <v-toolbar-title>{{ "Disposal Information" }}</v-toolbar-title>
          </v-toolbar>
          <v-divider class="my-4"></v-divider>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <div class="disposal-detail">
                <strong>Disposal Date:</strong>
                <div class="disposal-data">
                  {{ formatDate(assetDetails.disposalDate) || "N/A" }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="disposal-detail">
                <strong>Disposal Method:</strong>
                <div class="disposal-data">
                  {{ assetDetails.disposalMethod || "N/A" }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="disposal-detail">
                <strong>Disposal Price:</strong>
                <div class="disposal-data">
                  {{ formatCurrency(assetDetails.disposalPrice) || "N/A" }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="disposal-detail">
                <strong>Disposal Notes:</strong>
                <div class="disposal-data">
                  {{ assetDetails.disposalNotes || "No additional notes" }}
                </div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>

  <v-container>
    <v-row>
      <v-col cols="12">
        <!-- Divider and Tabs for History -->
        <v-divider class="my-4"></v-divider>

        <v-toolbar color="background">
          <v-toolbar-title>{{
            "History for " + assetDetails.serializedAssetName
          }}</v-toolbar-title>
        </v-toolbar>

        <v-divider class="my-4"></v-divider>

        <v-tabs v-model="selectedTab" background-color="primary" dark>
          <v-tab value="Assignments" color="primary">Assignments</v-tab>
          <v-tab value="Maintenance" color="primary">Maintenance</v-tab>
          <v-tab value="Warranty" color="primary">Warranties</v-tab>
          <v-tab value="Leasing" color="primary">Leases</v-tab>
          <v-tab value="Barcodes" color="primary">Barcodes</v-tab>
        </v-tabs>

        <!-- Data Tables -->
        <v-data-table
          v-if="selectedTab === 'Assignments'"
          :headers="assetHistoryHeaders"
          :items="fullAssetHistory"
          item-key="key"
          :items-per-page="5"
          :items-per-page-options="[5, 10, 20, 50]"
          v-model:sort-by="assignmentSortBy"
        >
          <template v-slot:item.checkoutDate="{ item }">
            <td>{{ formatDateTime(item.checkoutDate) }}</td>
          </template>
          <template v-slot:item.checkinDate="{ item }">
            <td>
              {{ formatCheckinDate(item.checkinDate) }}
            </td>
          </template>
          <template v-slot:item.checkedInBy="{ item }">
            <td>
              {{ formatCheckinPerson(item.checkedInBy) }}
            </td>
          </template>
        </v-data-table>

        <!-- Maintenance, Warranty, and Lease Data Tables -->
        <v-data-table
          v-if="selectedTab === 'Maintenance'"
          :headers="maintenanceLogHeaders"
          :items="maintenanceLogs"
          item-key="key"
          :items-per-page="5"
          :items-per-page-options="[5, 10, 20, 50]"
          v-model:sort-by="maintenanceSortBy"
        >
          <template v-slot:item.serviceDate="{ item }">
            <td>{{ formatDateTime(item.serviceDate) }}</td>
          </template>
          <template v-slot:item.type="{ item }">
            <td>
              <span v-if="item.isPreventative">Preventative</span>
              <span v-else-if="item.isRepair">Repair</span>
              <span v-else-if="item.isUpgrade">Upgrade</span>
            </td>
          </template>
          <template v-slot:item.view="{ item }">
            <v-btn
              icon
              class="table-icons"
              @click="
                openShowNotesDialog({
                  id: item.key,
                  type: 'log',
                  notes: item.notes,
                  serializedAssetName: item.serializedAssetName,
                  serviceDate: item.serviceDate,
                })
              "
            >
              <v-icon>mdi-note-text</v-icon>
            </v-btn>
          </template>
        </v-data-table>
        <v-data-table
          v-if="selectedTab === 'Warranty'"
          :headers="warrantyHeaders"
          :items="warranties"
          item-key="key"
          :items-per-page="5"
          :items-per-page-options="[5, 10, 20, 50]"
          v-model:sort-by="warrantiesSortBy"
        >
          <template v-slot:item.length="{ item }">
            <td>{{ formatLength(item.length) }}</td>
          </template>
          <template v-slot:item.startDate="{ item }">
            <td>{{ formatWarranty(item.startDate) }}</td>
          </template>
          <template v-slot:item.endDate="{ item }">
            <td>{{ formatWarranty(item.endDate) }}</td>
          </template>
          <template v-slot:item.activeStatus="{ item }">
            <td>{{ formatStatus(item.activeStatus) }}</td>
          </template>
        </v-data-table>
        <v-data-table
          v-if="selectedTab === 'Barcodes'"
          :headers="barcodeHeaders"
          :items="barcodes"
          item-key="key"
          :items-per-page="5"
          :items-per-page-options="[5, 10, 20, 50]"
        >
        </v-data-table>
        <v-data-table
          v-if="selectedTab === 'Leasing'"
          :headers="leaseHeaders"
          :items="leases"
          item-key="key"
          :items-per-page="5"
          :items-per-page-options="[5, 10, 20, 50]"
          v-model:sort-by="leasesSortBy"
        >
          <template v-slot:item.length="{ item }">
            <td>{{ formatLength(item.length) }}</td>
          </template>
          <template v-slot:item.startDate="{ item }">
            <td>{{ formatWarranty(item.startDate) }}</td>
          </template>
          <template v-slot:item.endDate="{ item }">
            <td>{{ formatWarranty(item.endDate) }}</td>
          </template>
          <template v-slot:item.activeStatus="{ item }">
            <td>{{ formatStatus(item.activeStatus) }}</td>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="showNotesDialog" max-width="500px">
    <v-card class="pa-4 rounded-xl">
      <v-card-title class="justify-space-between">
        Notes for {{ itemToDisplay.serializedAssetName }}
      </v-card-title>
      <v-card-text>
        {{ itemToDisplay.notes }}
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="cancelgrey" text @click="showNotesDialog = false">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
    {{ snackbarText }}
  </v-snackbar>
</template>
