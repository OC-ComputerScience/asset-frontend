<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import ReportServices from "../services/reportServices";
import moment from "moment-timezone";

const router = useRouter();
const reports = ref([]);
const reportSortBy = ref([{ key: "reportDate", order: "desc" }]);
const deleteDialog = ref(false);
const reportToDelete = ref(null);
const editDialog = ref(false);
const reportToEdit = ref({});
const originalReportName = ref(""); // Ref to store the original report name
const selectedTab = ref("Type");
const snackbar = ref(false);
const snackbarText = ref("");

// Function to fetch 20 most recent reports depending on tab
const retrieveReports = async () => {
  const reportType =
    selectedTab.value.toLowerCase() === "type" ? "type" : "assignment";
  try {
    const response = await ReportServices.getAll(reportType);
    reports.value = response.data;
  } catch (error) {
    console.error(`Error fetching ${reportType} reports:`, error);
  }
};

const viewReport = (report) => {
  let startDateParam = "null";
  let endDateParam = "null";

  // Check the report type and set the start and end dates accordingly
  if (report.reportType === "type") {
    startDateParam = report.startDate ? report.startDate : "null";
    endDateParam = report.endDate ? report.endDate : "null";
  } else if (report.reportType === "assignment") {
    startDateParam = report.startDate ? report.startDate : "null";
    endDateParam = report.endDate ? report.endDate : "null";
  }

  router.push({
    name: "reportGeneration",
    query: {
      reportId: report.reportId,
      dateFilter: report.dateFilter ? report.dateFilter : "Both",
      startDate: startDateParam,
      endDate: endDateParam,
      typeId: report.typeId ? report.typeId : "null",
      tab: selectedTab.value, // Pass the currently selected tab to the router
      reportType: report.reportType ? report.reportType : "null",
      customReportName: report.customReportName
        ? report.customReportName
        : "null",
    },
  });
};

// When opening the edit dialog, save the current name and open the dialog
const openEditDialog = (report) => {
  originalReportName.value =
    report.customReportName ||
    report.typeReportName ||
    report.assignmentReportName; // Save the original name
  reportToEdit.value = {
    ...report,
    customReportName: originalReportName.value,
  };
  editDialog.value = true;
};

// Computed property to check if the name has been changed
const hasNameChanged = computed(() => {
  return reportToEdit.value.customReportName !== originalReportName.value;
});

// The save function checks if the name has changed before saving
const saveReportName = async () => {
  if (hasNameChanged.value) {
    // Only proceed if the name has changed
    try {
      const updatedReport = {
        ...reportToEdit.value,
        customReportName: reportToEdit.value.customReportName,
      };
      await ReportServices.update(reportToEdit.value.reportId, updatedReport);
      editDialog.value = false;
      // Refresh list to show updated name
      retrieveReports();
      snackbarText.value = "Report name updated successfully.";
      snackbar.value = true; // Show the snackbar
    } catch (error) {
      console.error("Error updating report name:", error);
      snackbarText.value = "Failed to update report name.";
      snackbar.value = true; // Show error in snackbar
    }
  }
};

const deleteReport = async (reportId) => {
  try {
    await ReportServices.delete(reportId);
    // Refresh the reports list after deletion
    await retrieveReports();
  } catch (error) {
    console.error("Error deleting report:", error);
  }
};

const openDeleteDialog = (reportId) => {
  reportToDelete.value = reportId;
  deleteDialog.value = true;
};

const confirmDelete = async () => {
  if (reportToDelete.value) {
    await deleteReport(reportToDelete.value);
    deleteDialog.value = false;
    reportToDelete.value = null; // Reset the state
  }
};

const cancelDelete = () => {
  deleteDialog.value = false;
  reportToDelete.value = null; // Reset the state
};

// Navigate to the report generation page
const goToReportGeneration = () => {
  router.push({
    name: 'reportGeneration',
    query: {
      tab: selectedTab.value
    }
  });
};

const formatDate = (dateString) => {
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY");
};

const headers = computed(() => {
  const baseHeaders = [
    { title: "Creation Date", key: "reportDate" },
    { title: "View Report", key: "view", sortable: false },
    { title: "Edit Report", key: "edit", sortable: false },
    { title: "Delete Report", key: "delete", sortable: false },
  ];

  if (selectedTab.value === "Type") {
    return [
      { title: "Report Name", key: "typeReportName" },
      ...baseHeaders,
    ];
  } else {
    return [
      { title: "Report Name", key: "assignmentReportName" },
      ...baseHeaders,
    ];
  }
});

const filteredReports = computed(() => {
  return reports.value.filter(
    (report) => report.reportType === selectedTab.value.toLowerCase()
  );
});

watch(selectedTab, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    retrieveReports();
  }
});

onMounted(async () => {
  await retrieveReports();
});
</script>
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-toolbar color="background">
          <v-toolbar-title> Generated Reports </v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-divider style="width: 30%; height: 3px"></v-divider>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-tabs v-model="selectedTab" background-color="primary" dark>
          <v-tab value="Type" color="primary">
            <v-icon left class="mr-2">mdi-devices</v-icon> Type</v-tab
          >
          <v-tab value="Assignment" color="primary">
            <v-icon left class="mr-2">mdi-clipboard-account</v-icon>
            Assignment</v-tab
          >
        </v-tabs>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-fade-transition mode="out-in">
          <!-- Content for "Type" Reports -->
          <div v-if="selectedTab === 'Type'">
            <v-card>
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Report History</span>
                <v-btn
                  color="primary"
                  class="ma-2"
                  @click="goToReportGeneration"
                >
                  Generate New Report
                </v-btn>
              </v-card-title>
              <v-card-text>
                <v-data-table
                  :headers="headers"
                  :items="filteredReports"
                  class="elevation-1"
                  :items-per-page="10"
                  :items-per-page-options="[5, 10, 20, 50, -1]"
                  v-model:sort-by="reportSortBy"
                >
                  <template v-slot:item.reportDate="{ item }">
                    <td>{{ formatDate(item.reportDate) }}</td>
                  </template>
                  <template v-slot:item.view="{ item }">
                    <v-btn icon class="table-icons" @click="viewReport(item)">
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                  </template>

                  <template v-slot:item.edit="{ item }">
                    <v-btn
                      icon
                      class="table-icons"
                      @click="openEditDialog(item)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>

                  <template v-slot:item.delete="{ item }">
                    <v-btn
                      icon
                      class="table-icons"
                      @click="openDeleteDialog(item.reportId)"
                    >
                      <v-icon color="primary">mdi-delete</v-icon>
                    </v-btn>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </div>

          <!-- Content for Assignment Reports -->
          <div v-if="selectedTab === 'Assignment'">
            <v-card>
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Report History</span>
                <v-btn
                  color="primary"
                  class="ma-2"
                  @click="goToReportGeneration"
                >
                  Generate New Report
                </v-btn>
              </v-card-title>
              <v-card-text>
                <v-data-table
                  :headers="headers"
                  :items="filteredReports"
                  class="elevation-1"
                  :items-per-page="10"
                  :items-per-page-options="[5, 10, 20, 50, -1]"
                  v-model:sort-by="reportSortBy"
                >
                  <template v-slot:item.reportDate="{ item }">
                    <td>{{ formatDate(item.reportDate) }}</td>
                  </template>
                  <template v-slot:item.view="{ item }">
                    <v-btn icon class="table-icons" @click="viewReport(item)">
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                  </template>

                  <template v-slot:item.edit="{ item }">
                    <v-btn
                      icon
                      class="table-icons"
                      @click="openEditDialog(item)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>

                  <template v-slot:item.delete="{ item }">
                    <v-btn
                      icon
                      class="table-icons"
                      @click="openDeleteDialog(item.reportId)"
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

    <!-- Edit Report Name Dialog -->
    <v-dialog v-model="editDialog" persistent max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          Edit Report Name</v-card-title
        >
        <v-card-text>
          <v-text-field
            v-model="reportToEdit.customReportName"
            label="Report Name"
            variant="outlined"
            dense
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="editDialog = false"
            >Cancel</v-btn
          >
          <v-btn
            color="saveblue"
            text
            :disabled="!hasNameChanged"
            @click="saveReportName"
            >Save</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Report Dialog -->
    <v-dialog v-model="deleteDialog" persistent max-width="500px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Confirm Delete</v-card-title
        >
        <v-card-text>Are you sure you want to delete this report?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="cancelDelete">Cancel</v-btn>
          <v-btn color="primary" text @click="confirmDelete">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for Notifications -->
    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>
