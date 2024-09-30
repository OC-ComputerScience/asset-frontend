<script setup>
import AssetTypeServices from "../services/assetTypeServices";
import SerializedAssetServices from "../services/serializedAssetServices";
import PersonAssetServices from "../services/personAssetServices";
import BuildingAssetServices from "../services/buildingAssetServices";
import RoomAssetServices from "../services/roomAssetServices";
import ReportServices from "../services/reportServices";
import { ref, watch, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { zonedTimeToUtc } from "date-fns-tz";
import { format } from "date-fns";
import moment from "moment-timezone";

const message = ref("");
const selectedTab = ref("Type");
const assetTypes = ref([]);
const serializedAssets = ref([]);
const personAssets = ref([]);
const buildingAssets = ref([]);
const roomAssets = ref([]);
const confirmSaveDialog = ref(false);
const saveButtonDisabled = ref(false);

// Reactive states specific to the "Type" tab
const typeStartDate = ref(null);
const typeEndDate = ref(null);
const selectedTypeType = ref(null);
const typeDateFilterEnabled = ref(true);
const typeDateFilterSelection = ref("Both");
const typeReportGenerated = ref(false);
const typeReportData = ref([]);
const computedTypeReportName = ref("Type Report Results");

// Reactive states specific to the "Assignment" tab
const assignmentStartDate = ref(null);
const assignmentEndDate = ref(null);
const selectedTypeAssignment = ref(null);
const assignmentDateFilterEnabled = ref(true);
const assignmentDateFilterSelection = ref("Both");
const assignmentReportGenerated = ref(false);
const assignmentReportData = ref([]);
const computedAssignmentReportName = ref("Assignment Report Results");

const menuStart = ref(false);
const menuEnd = ref(false);
const snackbar = ref(false);
const snackbarText = ref("");
const route = useRoute();
const rules = {
  required: (value) => !!value || "Required.",
};
const retrievePersonAssets = async () => {
  try {
    const response = await PersonAssetServices.getAll();
    personAssets.value = response.data.map((personAsset) => {
      return {
        ...personAsset,
        fullName: personAsset.person ? personAsset.person.fullName : "Unknown",
        title: personAsset.serializedAsset
          ? personAsset.serializedAsset.serializedAssetName
          : "Unknown Asset",
      };
    });
  } catch (error) {
    console.error("Error loading person assets:", error);
    message.value = "Failed to load person assets.";
  }
};

const retrieveBuildingAssets = async () => {
  try {
    const response = await BuildingAssetServices.getAll();
    buildingAssets.value = response.data.map((buildingAsset) => {
      return {
        ...buildingAsset,
        name: buildingAsset.building ? buildingAsset.building.name : "Unknown",
        title: buildingAsset.serializedAsset
          ? buildingAsset.serializedAsset.serializedAssetName
          : "Unknown Asset",
      };
    });
  } catch (error) {
    console.error("Error loading building assets:", error);
    message.value = "Failed to load building assets.";
  }
};

const retrieveRoomAssets = async () => {
  try {
    const response = await RoomAssetServices.getAll();
    roomAssets.value = response.data.map((roomAsset) => {
      return {
        ...roomAsset,
        name: roomAsset.room ? roomAsset.room.roomName : "Unknown",
        title: roomAsset.serializedAsset
          ? roomAsset.serializedAsset.serializedAssetName
          : "Unknown Asset",
      };
    });
  } catch (error) {
    console.error("Error loading room assets:", error);
    message.value = "Failed to load room assets.";
  }
};

const retrieveAssetTypes = async () => {
  try {
    const typesResponse = await AssetTypeServices.getAll();
    assetTypes.value = typesResponse.data
      .filter((type) => type.activeStatus !== 0) 
      .map((type) => ({
        ...type,
        key: type.typeId,
        title: type.typeName,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    // Prepend the "All" option to the list of filtered and sorted asset types
    assetTypes.value = [{ key: "all", title: "All" }, ...assetTypes.value];
  } catch (error) {
    console.error("Error loading asset types:", error);
    message.value = "Failed to load asset types.";
  }
};

// After retrieving and mapping types, add an "All" option at the start
const allTypesOption = { key: "all", title: "All" }; // Create an "All" option
assetTypes.value = [allTypesOption, assetTypes.value]; // Prepend "All" option

// Retrieve SerializedAssets from Database
const retrieveSerializedAssets = async () => {
  try {
    const response = await SerializedAssetServices.getAll();
    serializedAssets.value = response.data.map((serializedAsset) => {
      return {
        ...serializedAsset,
        title: serializedAsset.serializedAssetName,
        profileName: serializedAsset.assetProfile
          ? serializedAsset.assetProfile.profileName
          : "Unknown",
        key: serializedAsset.serializedAssetId,
      };
    });
  } catch (error) {
    console.error("Error loading serialized assets:", error);
    message.value = "Failed to load serializedAssets.";
  }
};

// Example of a computed property for enabling the "Generate Report" button specifically for the "Type" tab
const canGenerateTypeReport = computed(() => {
  if (typeDateFilterEnabled.value) {
    return selectedTypeType.value && typeStartDate.value && typeEndDate.value;
  } else {
    return !!selectedTypeType.value; // Just check if a type is selected
  }
});

// Example of a computed property for enabling the "Generate Report" button specifically for the "Assignment" tab
const canGenerateAssignmentReport = computed(() => {
  if (assignmentDateFilterEnabled.value) {
    return (
      selectedTypeAssignment.value &&
      assignmentStartDate.value &&
      assignmentEndDate.value
    );
  } else {
    return !!selectedTypeAssignment.value; // Just check if a type is selected
  }
});

const generateTypeReport = async () => {
  let reportTypeId = null;

  // This block now only executes if typeDateFilterEnabled is true
  if (typeDateFilterEnabled.value) {
    // Check if the end date is before the start date
    if (moment(typeEndDate.value).isBefore(typeStartDate.value)) {
      snackbarText.value =
        "Please ensure the end date is after the start date.";
      snackbar.value = true;
      return; // Exit the function early as the date range is invalid
    }
  }

  let filteredAssets = [];
  // Adjust filtering logic to include an "All" option
  if (selectedTypeType.value && selectedTypeType.value.key === "all") {
    // If "All" is selected, include all assets without filtering by type
    filteredAssets = serializedAssets.value;
  } else if (selectedTypeType.value) {
    // Existing logic to filter by specific type
    filteredAssets = serializedAssets.value.filter((asset) => {
      const belongsToType =
        asset.assetProfile.typeId === selectedTypeType.value.typeId;
      return belongsToType;
    });
    reportTypeId = selectedTypeType.value.typeId;
  }

  // Further filter by date if date filtering is enabled
  if (typeDateFilterEnabled.value) {
    filteredAssets = filteredAssets.filter((asset) => {
      const acquisitionDate =
        asset.assetProfile && asset.assetProfile.acquisitionDate
          ? moment(asset.assetProfile.acquisitionDate)
          : null;
      const disposalDate = asset.disposalDate
        ? moment(asset.disposalDate)
        : null;
      const start = moment(typeStartDate.value).startOf("day");
      const end = moment(typeEndDate.value).endOf("day");

      let isWithinDateRange = false;
      switch (typeDateFilterSelection.value) {
        case "Acquisition Date":
          isWithinDateRange =
            acquisitionDate &&
            acquisitionDate.isSameOrAfter(start) &&
            acquisitionDate.isSameOrBefore(end);
          break;
        case "Disposal Date":
          isWithinDateRange =
            disposalDate &&
            disposalDate.isSameOrAfter(start) &&
            disposalDate.isSameOrBefore(end);
          break;
        case "Both":
        default:
          isWithinDateRange =
            (acquisitionDate &&
              acquisitionDate.isSameOrAfter(start) &&
              acquisitionDate.isSameOrBefore(end)) ||
            (disposalDate &&
              disposalDate.isSameOrAfter(start) &&
              disposalDate.isSameOrBefore(end));
      }

      return isWithinDateRange;
    });
  }

  // Mapping over filtered assets to prepare report data
  typeReportData.value = filteredAssets.map((asset) => ({
    ...asset,
    acquisitionDate: asset.assetProfile
      ? asset.assetProfile.acquisitionDate
      : null,
    disposalDate: asset.disposalDate,
    purchasePrice: asset.assetProfile ? asset.assetProfile.purchasePrice : null,
    disposalPrice: asset.disposalPrice,
  }));

  typeReportGenerated.value = true;
  saveButtonDisabled.value = false;
  if (filteredAssets.length === 0) {
    snackbarText.value = "No assets found with the selected criteria.";
    snackbar.value = true;
  } else {
    // Show snackbar for successful generation
    snackbarText.value = "Report generated successfully!";
    snackbar.value = true;
  }

  // Update report name based on the selection
  let reportName = "All Assets Report";
  if (selectedTypeType.value && selectedTypeType.value.title !== "All") {
    let prefix = "";
    if (typeDateFilterEnabled.value) {
      // Check if the date filter is enabled
      switch (typeDateFilterSelection.value) {
        case "Acquisition Date":
          prefix = "Acquired ";
          break;
        case "Disposal Date":
          prefix = "Disposed ";
          break;
        default:
          break;
      }
    }
    reportName = `${prefix}${selectedTypeType.value.title} Assets Report`;
  } else {
    if (typeDateFilterEnabled.value) {
      // Check conditionally based on the filter switch
      if (typeDateFilterSelection.value === "Acquisition Date") {
        reportName = "All Acquired Assets Report";
      } else if (typeDateFilterSelection.value === "Disposal Date") {
        reportName = "All Disposed Assets Report";
      }
    } else {
      reportName = "All Assets Report"; // Default report name when no filter is applied
    }
  }

  let dates = "";
  if (typeDateFilterEnabled.value && typeStartDate.value && typeEndDate.value) {
    dates = ` (${moment(typeStartDate.value).format("MMM DD, YYYY")} - ${moment(
      typeEndDate.value
    ).format("MMM DD, YYYY")})`;
  }

  computedTypeReportName.value = `${reportName}${
    typeDateFilterEnabled.value ? dates : ""
  }`;
};

const generateAssignmentReport = async () => {
  if (
    assignmentDateFilterEnabled.value &&
    assignmentStartDate.value &&
    assignmentEndDate.value &&
    moment(assignmentEndDate.value).isBefore(assignmentStartDate.value)
  ) {
    snackbarText.value = "Please ensure the end date is after the start date.";
    snackbar.value = true;
    return;
  }

  let combinedAssets = [
    ...personAssets.value,
    ...roomAssets.value,
    ...buildingAssets.value,
  ].map((asset) => ({
    ...asset,
    serializedAssetName: asset.serializedAsset
      ? asset.serializedAsset.serializedAssetName
      : "Unknown Asset",
    ownerFacility: asset.person
      ? asset.person.fullName
      : asset.room
      ? asset.room.roomName
      : asset.building
      ? asset.building.name
      : "Unknown",
    typeId:
      asset.serializedAsset && asset.serializedAsset.assetProfile
        ? asset.serializedAsset.assetProfile.typeId
        : null,
  }));


  // Filter by selected type if not 'All'
  if (
    selectedTypeAssignment.value &&
    selectedTypeAssignment.value.key !== "all"
  ) {
    combinedAssets = combinedAssets.filter(
      (asset) => asset.typeId === selectedTypeAssignment.value.key
    );
  }

  let filteredAssets = combinedAssets;

  // Apply date filters only if both start and end dates are set and date filtering is enabled
  if (
    assignmentDateFilterEnabled.value &&
    assignmentStartDate.value &&
    assignmentEndDate.value
  ) {
    const start = moment(assignmentStartDate.value).startOf("day");
    const end = moment(assignmentEndDate.value).endOf("day");

    filteredAssets = filteredAssets.filter((asset) => {
      const checkoutDate = asset.checkoutDate
        ? moment(asset.checkoutDate)
        : null;
      const checkinDate = asset.checkinDate ? moment(asset.checkinDate) : null;

      let includedByDate = false;
      switch (assignmentDateFilterSelection.value) {
        case "Both":
          includedByDate =
            (checkoutDate &&
              checkoutDate.isBetween(start, end, undefined, "[]")) ||
            (checkinDate && checkinDate.isBetween(start, end, undefined, "[]"));
          break;
        case "Checkout Date":
          includedByDate =
            checkoutDate && checkoutDate.isBetween(start, end, undefined, "[]");
          break;
        case "Checkin Date":
          includedByDate =
            checkinDate && checkinDate.isBetween(start, end, undefined, "[]");
          break;
      }
      return includedByDate;
    });
  }


  assignmentReportData.value = filteredAssets;
  assignmentReportGenerated.value = true;

  // Update report name
  let reportName = "Assets";
  if (assignmentDateFilterEnabled.value) {
    switch (assignmentDateFilterSelection.value) {
      case "Checkout Date":
        reportName = "Checked Out Assets";
        break;
      case "Checkin Date":
        reportName = "Checked In Assets";
        break;
      case "Both":
      default:
        reportName = "Managed Assets"; // or "Activity on Assets"
        break;
    }
  } else {
    reportName = "All Managed Assets";
  }

  if (
    selectedTypeAssignment.value &&
    selectedTypeAssignment.value.title !== "All"
  ) {
    reportName += `: ${selectedTypeAssignment.value.title}`;
  }

  let dateRange = "";
  if (
    assignmentDateFilterEnabled.value &&
    assignmentStartDate.value &&
    assignmentEndDate.value
  ) {
    dateRange = ` (${moment(assignmentStartDate.value).format(
      "MMM DD, YYYY"
    )} - ${moment(assignmentEndDate.value).format("MMM DD, YYYY")})`;
  }
  computedAssignmentReportName.value = `${reportName}${
    assignmentDateFilterEnabled.value ? dateRange : ""
  }`;

  // Notify user of report generation
  if (filteredAssets.length === 0) {
    snackbarText.value = "No assets found with the selected criteria.";
    snackbar.value = true;
  } else {
    snackbarText.value = "Report generated successfully!";
    snackbar.value = true;
    // Re-enable the Save button for the new report
    saveButtonDisabled.value = false;
  }
};

const saveTypeReport = async () => {
  if (!typeReportGenerated.value) {
    snackbarText.value = "Please generate the report before saving.";
    snackbar.value = true;
    return;
  }

  const reportDateUtc = convertToUtcForStorage(new Date());
  const formattedReportDate = format(reportDateUtc, "yyyy-MM-dd'T'HH:mm:ss'Z'");

  // Prepare the report data using "Type" tab-specific variables
  const reportData = {
    typeId:
      selectedTypeType.value && selectedTypeType.value.key !== "all"
        ? selectedTypeType.value.key
        : null,
    startDate:
      typeDateFilterEnabled.value && typeStartDate.value
        ? convertToUtcForStorage(typeStartDate.value)
        : null,
    endDate:
      typeDateFilterEnabled.value && typeEndDate.value
        ? convertToUtcForStorage(typeEndDate.value)
        : null,
    dateFilter: typeDateFilterEnabled.value
      ? typeDateFilterSelection.value
      : "Both",
    reportDate: formattedReportDate,
    reportType: "type", // This specifies the report as a type report
  };

  try {
    await ReportServices.create(reportData);
    snackbarText.value = "Report successfully saved!";
    snackbar.value = true;
    saveButtonDisabled.value = true; // Disable the Save button
  } catch (error) {
    console.error("Failed to save the report:", error);
    snackbarText.value = "Failed to save the report.";
    snackbar.value = true;
  } finally {
    confirmSaveDialog.value = false; // Close the dialog regardless of outcome
  }
};

const saveAssignmentReport = async () => {
  if (!assignmentReportGenerated.value) {
    snackbarText.value = "Please generate the report before saving.";
    snackbar.value = true;
    return;
  }

  // Prepare data for saving
  const reportDateUtc = convertToUtcForStorage(new Date());
  const formattedReportDate = format(reportDateUtc, "yyyy-MM-dd'T'HH:mm:ss'Z'");

  const reportData = {
    typeId:
      selectedTypeAssignment.value && selectedTypeAssignment.value.key !== "all"
        ? selectedTypeAssignment.value.key
        : null,
    startDate:
      assignmentStartDate.value && assignmentDateFilterEnabled.value
        ? convertToUtcForStorage(assignmentStartDate.value)
        : null,
    endDate:
      assignmentEndDate.value && assignmentDateFilterEnabled.value
        ? convertToUtcForStorage(assignmentEndDate.value)
        : null,
    dateFilter: assignmentDateFilterEnabled.value
      ? assignmentDateFilterSelection.value
      : "Both",
    reportDate: formattedReportDate,
    reportType: "assignment", // This specifies the report as an assignment report
  };

  try {
    await ReportServices.create(reportData);
    snackbarText.value = "Report successfully saved!";
    snackbar.value = true;
    saveButtonDisabled.value = true; // Disable the Save button after successful save
  } catch (error) {
    console.error("Failed to save the report:", error);
    snackbarText.value = "Failed to save the report.";
    snackbar.value = true;
  } finally {
    confirmSaveDialog.value = false; // Close the save confirmation dialog
  }
};

const saveReport = () => {
  if (selectedTab.value === "Type") {
    saveTypeReport();
  } else if (selectedTab.value === "Assignment") {
    saveAssignmentReport();
  } else {
    console.error("Unknown tab type:", selectedTab.value);
    // Handle error or unexpected case
  }
};

const exportTypeReport = () => {
  if (!typeReportGenerated.value) {
    snackbarText.value = "Please generate the report before exporting.";
    snackbar.value = true;
    return;
  }

  // Exclude the "Total Spent" row from the dataset for CSV export
  const reportDataForExport = typeReportData.value.filter(
    (item) => !item.isTotalRow
  );

  let csvContent = "data:text/csv;charset=utf-8,";

  const reportCreationDate = moment().format("MMM DD, YYYY");
  csvContent += `"Report Creation Date: ${reportCreationDate}"\r\n`;
  csvContent +=
    typeReportHeaders.value.map((header) => `"${header.title}"`).join(",") +
    "\r\n";

  reportDataForExport.forEach((row) => {
    let rowData = typeReportHeaders.value.map((header) => {
      let keyValue;
      if (header.key.includes("disposalDate")) {
        // Properly handle disposal dates
        keyValue = row.disposalDate ? formatDate(row.disposalDate) : ""; // Use empty string or "N/A" if disposalDate is not applicable
      } else {
        keyValue = header.key.split(".").reduce((o, i) => o[i], row);
        if (
          header.key.includes("purchasePrice") ||
          header.key.includes("disposalPrice") ||
          header.key.includes("acquisitionDate")
        ) {
          keyValue = header.key.includes("acquisitionDate")
            ? formatDate(keyValue)
            : formatCurrency(keyValue);
        }
      }
      return `"${keyValue ? keyValue.toString().replace(/"/g, '""') : ""}"`;
    });
    csvContent += rowData.join(",") + "\r\n";
  });

  // Add "Total Spent" manually at the end of the CSV
  csvContent += `"Total Acquired/Disposed",,${formatCurrencyForCSV(
    totalSpent.value
  )},,,${formatCurrencyForCSV(totalSold.value)}\r\n`;

  let encodedUri = encodeURI(csvContent);
  let link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  let reportName = computedReportTitle.value.replace(/[^a-zA-Z0-9 \-(),]/g, "");
  link.setAttribute("download", `${reportName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  snackbarText.value = "Report exported successfully!";
  snackbar.value = true;
};

const exportAssignmentReport = () => {
  if (!assignmentReportGenerated.value) {
    snackbarText.value = "Please generate the report before exporting.";
    snackbar.value = true;
    return;
  }

  // Start the CSV content with UTF-8 encoding
  let csvContent = "data:text/csv;charset=utf-8,";

  // Add the report creation date at the top
  const reportCreationDate = moment().format("MMM DD, YYYY");
  csvContent += `"Report Creation Date: ${reportCreationDate}"\r\n`;

  // Add headers
  const headers = assignmentReportHeaders.value
    .map((header) => `"${header.title}"`)
    .join(",");
  csvContent += headers + "\r\n";

  // Map over the assignment report data to format each row for CSV
  assignmentReportData.value.forEach((item) => {
    const rowData = assignmentReportHeaders.value
      .map((header) => {
        const keyPath = header.key.split("."); // Handle nested keys
        let value = item;

        // Traverse the object based on the key path
        for (let key of keyPath) {
          value = value?.[key]; // Use optional chaining to avoid errors
        }

        // Format date and numeric values appropriately
        if (
          value instanceof Date ||
          (typeof value === "string" && !isNaN(Date.parse(value)))
        ) {
          value = formatDate(value);
        } else if (typeof value === "number") {
          value = formatCurrency(value);
        }

        return `"${(value ?? "").toString().replace(/"/g, '""')}"`; // Escape double quotes in CSV
      })
      .join(",");

    csvContent += rowData + "\r\n"; // Append the formatted row to the CSV content
  });

  // Encode the CSV content and create a downloadable link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);

  // Ensure the report name is properly formatted
  const reportName = computedReportTitle.value.replace(
    /[^a-zA-Z0-9 \-(),]/g,
    ""
  );
  link.setAttribute("download", `${reportName}.csv`); // Use a dynamic name

  // Append and trigger the download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  snackbarText.value = "Report exported successfully!";
  snackbar.value = true;
};

const hasTypeReportData = computed(() => {
  return typeReportData.value.length > 0;
});

const hasAssignmentReportData = computed(() => {
  return assignmentReportData.value.length > 0;
});

const translateStatus = (status) => {
  return status ? "Checked Out" : "Available";
};

// Function to convert a date from Central Time Zone to UTC
const convertToUtcForStorage = (localDate) => {
  const timeZone = "America/Chicago"; // Adjust to your local time zone as needed
  return zonedTimeToUtc(localDate, timeZone);
};

const formattedTypeStartDate = computed(() => {
  return typeStartDate.value
    ? moment(typeStartDate.value).format("MMM DD, YYYY")
    : "";
});

const formattedAssignmentStartDate = computed(() => {
  return assignmentStartDate.value
    ? moment(assignmentStartDate.value).format("MMM DD, YYYY")
    : "";
});

const formattedTypeEndDate = computed(() => {
  return typeEndDate.value
    ? moment(typeEndDate.value).format("MMM DD, YYYY")
    : "";
});

const formattedAssignmentEndDate = computed(() => {
  return assignmentEndDate.value
    ? moment(assignmentEndDate.value).format("MMM DD, YYYY")
    : "";
});

const formatDate = (dateString) => {
  // Define a regex that matches both the "YYYY-MM-DD HH:MM:SS" and ISO string formats
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}(\s|\T)\d{2}:\d{2}:\d{2}/;

  // Check if the dateString follows the expected datetime patterns
  if (dateString && dateTimePattern.test(dateString)) {
    // Convert dateString to a Date object to verify it's a valid date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // If valid, format and return
      return moment(date).format("MMM DD, YYYY");
    }
  }
  // Return the original string if it doesn't match the pattern or isn't a valid date
  return dateString;
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

const formatCurrencyForCSV = (value) => {
  // Convert the number to a currency format without using comma for thousands separator
  const formattedNumber = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    // Use these options to avoid comma as thousands separator
    useGrouping: false, // This will remove the grouping separator (comma)
  }).format(value);

  // Directly return the formatted string
  return formattedNumber;
};

const totalSpent = computed(() => {
  const total = typeReportData.value.reduce((acc, asset) => {
    return acc + (parseFloat(asset.purchasePrice) || 0);
  }, 0);
  return total;
});

const totalSold = computed(() => {
  const total = typeReportData.value.reduce((acc, asset) => {
    return acc + (parseFloat(asset.disposalPrice) || 0);
  }, 0);
  return total;
});
// Define headers for the type table
const typeReportHeaders = ref([
  { title: "Asset Name", key: "serializedAssetName" },
  { title: "Acquisition Date", key: "assetProfile.acquisitionDate" },
  { title: "Purchase Price", key: "assetProfile.purchasePrice" },
  { title: "Disposal Date", key: "disposalDate" },
  { title: "Disposal Method", key: "disposalMethod" },
  { title: "Disposal Price", key: "disposalPrice" },
]);

const computedReportTitle = computed(() => {
  if (route.query.customReportName && route.query.customReportName !== "null") {
    return route.query.customReportName;
  } else {
    return selectedTab.value === "Type"
      ? computedTypeReportName.value
      : computedAssignmentReportName.value;
  }
});

// Define headers for the assignment table
const assignmentReportHeaders = ref([
  { title: "Owner/Facility", key: "ownerFacility" },
  { title: "Asset Name", key: "serializedAssetName" },
  { title: "Checkout Date", key: "checkoutDate" },
  { title: "Check-in Date", key: "checkinDate" },
]);

// A computed property that combines tab and status
const tab = computed(() => {
  return { tab: selectedTab.value };
});

function setAndGenerateTypeReport(query) {
  if (query.startDate !== "null" && query.endDate !== "null") {
    typeStartDate.value = new Date(query.startDate);
    typeEndDate.value = new Date(query.endDate);
    typeDateFilterEnabled.value = true;
  } else {
    typeDateFilterEnabled.value = false;
  }

  selectedTypeType.value = findTypeByKey(query.typeId);
  typeDateFilterSelection.value = query.dateFilter || "Both";

  // Check if customReportName is provided and set it
  if (query.customReportName) {
    typeReportData.value = [
      { ...typeReportData.value[0], customReportName: query.customReportName },
    ];
  }

  generateTypeReport();
}

function setAndGenerateAssignmentReport(query) {
  if (query.startDate !== "null" && query.endDate !== "null") {
    assignmentStartDate.value = new Date(query.startDate);
    assignmentEndDate.value = new Date(query.endDate);
    assignmentDateFilterEnabled.value = true;
  } else {
    assignmentDateFilterEnabled.value = false;
  }

  selectedTypeAssignment.value = findTypeByKey(query.typeId);
  assignmentDateFilterSelection.value = query.dateFilter || "Both";

  // Check if customReportName is provided and set it
  if (query.customReportName) {
    assignmentReportData.value = [
      {
        ...assignmentReportData.value[0],
        customReportName: query.customReportName,
      },
    ];
  }

  generateAssignmentReport();
}

function findTypeByKey(typeId) {
  return (
    assetTypes.value.find((type) => `${type.key}` === typeId) ||
    assetTypes.value[0]
  );
}

// Watching multiple sources to see if there is a change, if there is export and save disable
watch(
  [
    typeStartDate,
    typeEndDate,
    selectedTypeType,
    typeDateFilterEnabled,
    typeDateFilterSelection,
  ],
  () => {
    // Any change in the watched properties will trigger this callback,
    // indicating that the current report might no longer be up-to-date.
    typeReportGenerated.value = false;
  },
  {
    deep: true,
  }
);

// Watching multiple sources to see if there is a change, if there is export and save disable
watch(
  [
    assignmentStartDate,
    assignmentEndDate,
    selectedTypeAssignment,
    assignmentDateFilterEnabled,
    assignmentDateFilterSelection,
  ],
  () => {
    // Any change in the watched properties will trigger this callback,
    // indicating that the current report might no longer be up-to-date.
    assignmentReportGenerated.value = false;
  },
  {
    deep: true,
  }
);

// Makes sure export and save are enabled when coming from view report
watch(
  typeReportData,
  (newValues, oldValues) => {
    // Check if newValues contain data and set typeReportGenerated accordingly
    typeReportGenerated.value = typeReportData.value.length > 0;
  },
  { deep: true, immediate: true }
);

// Makes sure export and save are enabled when coming from view report
watch(
  assignmentReportData,
  (newValues, oldValues) => {
    // Check if newValues contain data and set typeReportGenerated accordingly
    assignmentReportGenerated.value = assignmentReportData.value.length > 0;
  },
  { deep: true, immediate: true }
);

// Watcher for both selectedTab and selectedStatus
watch(
  tab,
  async (current) => {
    switch (current.tab) {
      case "Type":
        await retrieveSerializedAssets();
        await retrieveAssetTypes();
        break;
      case "Assignment":
        await retrieveAssetTypes();
        await retrievePersonAssets();
        await retrieveBuildingAssets();
        await retrieveRoomAssets();
        break;
      default:
        console.error("Unknown tab:", current.tab);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (route.query.tab) {
    selectedTab.value = route.query.tab; // Set the tab based on the query parameter
  }

  if (route.query.reportId) {
    const dataFetchers = [];

    // Push all necessary fetchers based on the tab or conditions
    dataFetchers.push(retrieveAssetTypes());
    if (route.query.reportType === "type") {
      dataFetchers.push(retrieveSerializedAssets());
    } else if (route.query.reportType === "assignment") {
      dataFetchers.push(
        retrievePersonAssets(),
        retrieveBuildingAssets(),
        retrieveRoomAssets()
      );
    }

    // Wait for all data to be fetched before generating the report
    await Promise.all(dataFetchers);

    // Continue with setting the parameters and generating the report
    if (route.query.reportType === "type") {
      setAndGenerateTypeReport(route.query);
    } else if (route.query.reportType === "assignment") {
      setAndGenerateAssignmentReport(route.query);
    }
  }
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-toolbar color="background">
          <v-toolbar-title> Generate Asset Reports </v-toolbar-title>
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
            <!-- Date Filtering Section -->
            <v-row class="px-5">
              <v-col cols="12">
                <v-switch
                  v-model="typeDateFilterEnabled"
                  label="Date Filter"
                  color="saveblue"
                ></v-switch>
              </v-col>
            </v-row>

            <!-- Date Filter Selection and Date Pickers Row -->
            <v-row class="px-5">
              <!-- Date Filter Selection -->
              <v-col cols="12" md="4">
                <v-select
                  v-model="typeDateFilterSelection"
                  prepend-icon="mdi-swap-vertical"
                  :items="['Both', 'Acquisition Date', 'Disposal Date']"
                  label="Filter by Acquisition/Disposal"
                  variant="outlined"
                  clearable
                  solo
                  :disabled="!typeDateFilterEnabled"
                ></v-select>
              </v-col>

              <!-- Start Date Picker -->
              <v-col cols="12" md="4">
                <v-menu
                  v-model="menuStart"
                  :close-on-content-click="false"
                  offset-y
                  transition="scale-transition"
                  min-width="auto"
                  activator="#start-menu-activator-type"
                >
                  <template v-slot:activator="{ attrs }">
                    <v-text-field
                      id="start-menu-activator-type"
                      v-model="formattedTypeStartDate"
                      label="Start Date"
                      variant="outlined"
                      prepend-icon="mdi-calendar"
                      :rules="typeDateFilterEnabled ? [rules.required] : []"
                      readonly
                      v-bind="attrs"
                      @click="menuStart = !menuStart"
                      :disabled="!typeDateFilterEnabled"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="typeStartDate"
                    @input="menuStart = false"
                    color="primary"
                  ></v-date-picker>
                </v-menu>
              </v-col>

              <!-- End Date Picker -->
              <v-col cols="12" md="4">
                <v-menu
                  v-model="menuEnd"
                  :close-on-content-click="false"
                  offset-y
                  transition="scale-transition"
                  min-width="auto"
                  activator="#end-menu-activator-type"
                >
                  <template v-slot:activator="{ attrs }">
                    <v-text-field
                      id="end-menu-activator-type"
                      v-model="formattedTypeEndDate"
                      label="End Date"
                      variant="outlined"
                      prepend-icon="mdi-calendar"
                      :rules="typeDateFilterEnabled ? [rules.required] : []"
                      readonly
                      v-bind="attrs"
                      @click="menuEnd = !menuEnd"
                      :disabled="!typeDateFilterEnabled"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="typeEndDate"
                    @input="menuEnd = false"
                    color="primary"
                  ></v-date-picker>
                </v-menu>
              </v-col>
            </v-row>

            <!-- Asset Type Selection Row -->
            <v-row class="px-5">
              <v-col cols="12" md="4">
                <v-autocomplete
                  v-model="selectedTypeType"
                  prepend-icon="mdi-devices"
                  :items="assetTypes"
                  item-text="title"
                  item-value="key"
                  label="Select Asset Type"
                  variant="outlined"
                  return-object
                  clearable
                  solo
                ></v-autocomplete>
              </v-col>
            </v-row>

            <!-- Report Generation Button and Report Results for "Type" -->
            <v-row>
              <v-col cols="12">
                <v-card class="mt-4">
                  <v-row class="d-flex align-center">
                    <v-col cols="12">
                      <v-card-title class="custom-card-title">
                        <span>{{ computedReportTitle }}</span>
                        <div class="d-flex align-center">
                          <v-btn
                            icon
                            color="saveblue"
                            :disabled="
                              !hasTypeReportData ||
                              !typeReportGenerated ||
                              saveButtonDisabled
                            "
                            @click="confirmSaveDialog = true"
                            class="report-icons"
                          >
                            <v-icon size="26px">mdi-content-save</v-icon>
                          </v-btn>
                          <v-btn
                            icon
                            color="primary"
                            :disabled="
                              !hasTypeReportData || !typeReportGenerated
                            "
                            @click="exportTypeReport"
                            class="report-icons"
                          >
                            <v-icon size="26px">mdi-download</v-icon>
                          </v-btn>
                          <v-btn
                            color="primary"
                            :disabled="!canGenerateTypeReport"
                            @click="generateTypeReport"
                          >
                            Generate Report
                          </v-btn>
                        </div>
                      </v-card-title>
                    </v-col>
                  </v-row>
                  <v-card-text>
                    <v-data-table
                      :headers="typeReportHeaders"
                      :items="typeReportData"
                      class="elevation-1 data-table-hover"
                      :items-per-page="10"
                      :items-per-page-options="[5, 10, 20, 50, -1]"
                    >
                      <!-- Existing item slots -->
                      <template v-slot:item="{ item }">
                        <tr :class="{ 'total-row': item.isTotalRow }">
                          <td>{{ item.serializedAssetName }}</td>
                          <td>{{ formatDate(item.acquisitionDate) || "" }}</td>
                          <td>
                            <span v-if="!item.isTotalRow">
                              {{ formatCurrency(item.purchasePrice) }}
                            </span>
                            <strong v-else>
                              {{ formatCurrency(item.purchasePrice) }}
                            </strong>
                          </td>
                          <td>{{ formatDate(item.disposalDate) || "" }}</td>
                          <td>{{ item.disposalMethod }}</td>
                          <td>
                            {{ formatCurrency(item.disposalPrice) || "" }}
                          </td>
                        </tr>
                      </template>
                    </v-data-table>
                  </v-card-text>
                  <v-row>
                    <v-col cols="12">
                      <v-card>
                        <v-card-title> Report Summary </v-card-title>

                        <v-card-text>
                          <v-row>
                            <v-col>
                              <strong>Total Purchase Price:</strong>
                              {{ formatCurrency(totalSpent) }}
                            </v-col>
                            <v-col>
                              <strong>Total Disposal Price:</strong>
                              {{ formatCurrency(totalSold) }}
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Content for Assignment Reports -->
          <div v-if="selectedTab === 'Assignment'">
            <!-- Date Filtering Section -->
            <v-row class="px-5">
              <v-col cols="12">
                <v-switch
                  v-model="assignmentDateFilterEnabled"
                  :label="'Date Filter'"
                  color="saveblue"
                ></v-switch>
              </v-col>
            </v-row>

            <!-- Date Filter Selection and Date Pickers Row -->
            <v-row class="px-5">
              <!-- Date Filter Selection -->
              <v-col cols="12" md="4">
                <v-select
                  v-model="assignmentDateFilterSelection"
                  prepend-icon="mdi-swap-vertical"
                  :items="['Both', 'Checkout Date', 'Checkin Date']"
                  label="Filter by Check-In/Out"
                  variant="outlined"
                  clearable
                  solo
                  :disabled="!assignmentDateFilterEnabled"
                ></v-select>
              </v-col>

              <!-- Start Date Picker -->
              <v-col cols="12" md="4">
                <v-menu
                  v-model="menuStart"
                  :close-on-content-click="false"
                  offset-y
                  transition="scale-transition"
                  min-width="auto"
                  activator="#start-menu-activator-assignment"
                >
                  <template v-slot:activator="{ attrs }">
                    <v-text-field
                      id="start-menu-activator-assignment"
                      v-model="formattedAssignmentStartDate"
                      label="Start Date"
                      variant="outlined"
                      prepend-icon="mdi-calendar"
                      :rules="
                        assignmentDateFilterEnabled ? [rules.required] : []
                      "
                      readonly
                      v-bind="attrs"
                      @click="menuStart = !menuStart"
                      :disabled="!assignmentDateFilterEnabled"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="assignmentStartDate"
                    @input="menuStart = false"
                    color="primary"
                  ></v-date-picker>
                </v-menu>
              </v-col>

              <!-- End Date Picker -->
              <v-col cols="12" md="4">
                <v-menu
                  v-model="menuEnd"
                  :close-on-content-click="false"
                  offset-y
                  transition="scale-transition"
                  min-width="auto"
                  activator="#end-menu-activator-assignment"
                >
                  <template v-slot:activator="{ attrs }">
                    <v-text-field
                      id="end-menu-activator-assignment"
                      v-model="formattedAssignmentEndDate"
                      label="End Date"
                      variant="outlined"
                      prepend-icon="mdi-calendar"
                      :rules="
                        assignmentDateFilterEnabled ? [rules.required] : []
                      "
                      readonly
                      v-bind="attrs"
                      @click="menuEnd = !menuEnd"
                      :disabled="!assignmentDateFilterEnabled"
                    ></v-text-field>
                  </template>
                  <v-date-picker
                    v-model="assignmentEndDate"
                    @input="menuEnd = false"
                    color="primary"
                  ></v-date-picker>
                </v-menu>
              </v-col>
            </v-row>

            <!-- Asset Type Selection Row -->
            <v-row class="px-5">
              <v-col cols="12" md="4">
                <v-autocomplete
                  v-model="selectedTypeAssignment"
                  prepend-icon="mdi-devices"
                  :items="assetTypes"
                  item-text="title"
                  item-value="key"
                  label="Select Asset Type"
                  variant="outlined"
                  return-object
                  clearable
                  solo
                ></v-autocomplete>
              </v-col>
            </v-row>

            <!-- Report Results for Assignment -->
            <v-row>
              <v-col cols="12">
                <v-card class="mt-4">
                  <!-- Header Row for Title and Generate Report Button -->
                  <v-row class="d-flex align-center">
                    <v-col cols="12">
                      <v-card-title class="custom-card-title">
                        <span>{{ computedReportTitle }}</span>
                        <div class="d-flex align-center">
                          <v-btn
                            icon
                            color="saveblue"
                            :disabled="
                              !hasAssignmentReportData ||
                              !assignmentReportGenerated ||
                              saveButtonDisabled
                            "
                            @click="confirmSaveDialog = true"
                            class="report-icons"
                          >
                            <v-icon size="26px">mdi-content-save</v-icon>
                          </v-btn>
                          <v-btn
                            icon
                            color="primary"
                            :disabled="
                              !hasAssignmentReportData ||
                              !assignmentReportGenerated
                            "
                            @click="exportAssignmentReport"
                            class="report-icons"
                          >
                            <v-icon size="26px">mdi-download</v-icon>
                          </v-btn>
                          <v-btn
                            color="primary"
                            :disabled="!canGenerateAssignmentReport"
                            @click="generateAssignmentReport"
                          >
                            Generate Report
                          </v-btn>
                        </div>
                      </v-card-title>
                    </v-col>
                  </v-row>

                  <v-card-text>
                    <v-data-table
                      :headers="assignmentReportHeaders"
                      :items="assignmentReportData"
                      class="elevation-1 data-table-hover"
                      :items-per-page="10"
                      :items-per-page-options="[5, 10, 20, 50, -1]"
                    >
                      <template v-slot:item="{ item }">
                        <tr :class="{ 'total-row': item.isTotalRow }">
                          <td>{{ item.ownerFacility }}</td>
                          <td>{{ item.serializedAssetName }}</td>
                          <td>{{ formatDate(item.checkoutDate) || "" }}</td>
                          <td>{{ formatDate(item.checkinDate) || "" }}</td>
                        </tr>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-fade-transition>
      </v-col>
    </v-row>

    <!-- Save Report Dialog -->
    <v-dialog v-model="confirmSaveDialog" persistent max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">Confirm Save</v-card-title>
        <v-card-text
          >Are you sure you want to save this report? It will be added to report
          history.</v-card-text
        >
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="confirmSaveDialog = false"
            >Cancel</v-btn
          >
          <v-btn color="saveblue" text @click="saveReport">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for Notifications -->
    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.data-table-hover tbody tr:hover,
.data-table-hover tbody tr.selected-row {
  background-color: #e0e0e0; /* Light grey background for hover */
}

.total-row {
  background-color: #f0f0f0;
  font-weight: bold;
}

.data-table-footer {
  font-weight: bold;
  color: #333; /* Darker font for better visibility */
  background-color: #f7f7f7; /* Slightly different from the total-row */
}

.custom-card-title {
  display: flex;
  justify-content: space-between; /* Optional alignment of content within the card title */
}

.custom-card-title span {
  max-width: 70%; /* Limits the width of the title */
  white-space: normal; /* Allows text to wrap */
  overflow-wrap: break-word; /* Ensures proper text wrapping */
}
</style>
