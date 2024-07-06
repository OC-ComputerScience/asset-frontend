<script setup>
import SerializedAssetServices from "../services/serializedAssetServices";
import PersonServices from "../services/personServices";
import PersonAssetServices from "../services/personAssetServices";
import BuildingServices from "../services/buildingServices";
import BuildingAssetServices from "../services/buildingAssetServices";
import RoomServices from "../services/roomServices";
import RoomAssetServices from "../services/roomAssetServices";
import UserRoleServices from "../services/userRoleServices";
import NotificationSender from "../components/NotificationSender.vue";
import { ref, onMounted, watch, computed } from "vue";
import store from "../store/store.js";
import { format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import moment from "moment-timezone";

const userRole = ref({});
const message = ref("");
const selectedTab = ref("People");
const selectedStatus = ref("Checkout");
const selectedPersonAsset = ref("");
const selectedBuildingAsset = ref("");
const selectedRoomAsset = ref("");
const serializedAssets = ref([]);
const assetProfiles = ref([]);
const people = ref([]);
const personAssets = ref([]);
const buildings = ref([]);
const buildingAssets = ref([]);
const rooms = ref([]);
const roomAssets = ref([]);
const showAddNewPersonDialog = ref(false);
const showPersonCheckoutDialog = ref(false);
const showPersonCheckinDialog = ref(false);
const showBuildingCheckoutDialog = ref(false);
const showBuildingCheckinDialog = ref(false);
const showRoomCheckoutDialog = ref(false);
const showRoomCheckinDialog = ref(false);
const checkoutFormValid = ref(false);
const checkinFormValid = ref(false);
const personCheckoutForm = ref(null);
const buildingCheckoutForm = ref(null);
const roomCheckoutForm = ref(null);
const personCheckinForm = ref(null);
const buildingCheckinForm = ref(null);
const roomCheckinForm = ref(null);
const menu = ref(false);
const indefiniteCheckout = ref(true);
const expectedCheckinDate = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const loginUser = computed(() => store.getters.getLoginUserInfo);
const checkedOutInByFullName = `${loginUser.value.fName} ${loginUser.value.lName}`;
const checkoutSortBy = ref([{ key: "checkoutDate", order: "desc" }]);
const checkinSortBy = ref([{ key: "checkinDate", order: "desc" }]);
const notificationSender = ref(null);
const messageText = ref("");
const rules = {
  required: (value) => !!value || "Required.",
};
const userRoleId = computed(() => {
  return store.getters.getUserRole;
});
const getUserRole = async () => {
  userRole.value = await UserRoleServices.get(userRoleId.value);

  return userRole.value;
};
const newPersonAsset = ref({
  serializedAssetId: "",
  personId: "",
  checkoutDate: "",
  checkoutStatus: "",
  expectedCheckinDate: "",
  checkedOutBy: "",
});
const newBuildingAsset = ref({
  serializedAssetId: "",
  buildingId: "",
  checkoutDate: "",
  checkoutStatus: "",
  expectedCheckinDate: "",
  checkedOutBy: "",
});
const newRoomAsset = ref({
  serializedAssetId: "",
  roomId: "",
  checkoutDate: "",
  checkoutStatus: "",
  expectedCheckinDate: "",
  checkedOutBy: "",
});

const idNumber = ref("");
const email = ref("");
const newPerson = ref(null);

// *** People Section ***
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
      if (roomNumber != null) {
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
      if (roomNumber != null) {
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
  await PersonServices.create(newPerson.value)
    .then(async (response) => {
      snackbarText.value = "Person added successfully!";
      snackbar.value = true;
      closeAddNewPersonDialog();
      await retrievePeople();
      newPersonAsset.value.personId = response.data.personId;
      idNumber.value = "";
      email.value = "";
      newPerson.value = {
        fName: "",
        lName: "",
        email: "",
        idNumber: "",
        roomId: null,
        activeStatus: true,
      };
    })
    .catch((error) => {
      console.error("Error saving new person:", error);
      snackbarText.value = "Failed to add the person. Already exists.";
      snackbar.value = true;
    });
};
// Retrieve People from Database
const retrievePeople = async () => {
  try {
    const response = await PersonServices.getAll();
    // Sort by fullNameWithId before updating people.value
    const sortedPeople = response.data
      .filter((person) => person.activeStatus !== false) // Filter out archived people
      .map((person) => ({
        ...person,
        title: person.fullNameWithId, // Ensure fullNameWithId is used as title for consistency
        key: person.personId,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort people by fullNameWithId

    people.value = sortedPeople;
  } catch (error) {
    console.error("Error loading people:", error);
  }
};

const retrievePersonAssets = async () => {
  try {
    let response;
    // Check if the user's role category ID is 4
    if (userRole.value.data.categoryId === 4) {
      response = await PersonAssetServices.getAll();
    } else {
      // Fetch person assets by specific category ID

      response = await PersonAssetServices.getPersonAssetsByCategoryId(
        userRole.value.data.categoryId
      );
    }

    // Process the response data
    personAssets.value = response.data.map((personAsset) => {
      const person = people.value.find((p) => p.key === personAsset.personId);
      const serializedAsset = serializedAssets.value.find(
        (sa) => sa.key === personAsset.serializedAssetId
      );

      // Constructing a combined title with person's full name and asset's title
      const combinedTitle = person
        ? `${person.fullName}: ${
            serializedAsset
              ? serializedAsset.serializedAssetName
              : "Unknown Asset"
          }`
        : "Unknown Person: Unknown Asset";

      return {
        ...personAsset,
        title: combinedTitle, // Modified title property
        assetName: serializedAsset
          ? serializedAsset.serializedAssetName
          : "Unknown Asset",
        fullName: person ? person.fullName : "Unknown",
      };
    });
  } catch (error) {
    console.error("Error loading person assets:", error);
    message.value = "Failed to load person assets.";
  }
};

const savePersonCheckout = async () => {
  if (newPersonAsset.value.personId && newPersonAsset.value.serializedAssetId) {
    const checkoutDateUtc = convertToUtcForStorage(new Date());
    // Use the local time directly, formatting it to match the check-in formatting
    const formattedCheckoutDate = format(
      checkoutDateUtc,
      "yyyy-MM-dd'T'HH:mm:ss'Z'"
    );

    let checkinDate = null;
    if (!indefiniteCheckout.value && expectedCheckinDate.value) {
      // Since you're already using local time for checkout, ensure that expected check-in date handling is consistent
      checkinDate = format(new Date(expectedCheckinDate.value), "MMM dd, yyyy");
    }

    if (newPersonAsset.value.personId.key === undefined) {
      newPersonAsset.value.personId = people.value.find(
        (person) => person.personId === newPersonAsset.value.personId
      );
    }

    const personAssetData = {
      serializedAssetId: newPersonAsset.value.serializedAssetId.key,
      personId: newPersonAsset.value.personId.key,
      checkoutDate: formattedCheckoutDate,
      checkoutStatus: true,
      expectedCheckinDate: checkinDate,
      checkedOutBy: checkedOutInByFullName,
    };

    try {
      // Create new PersonAsset record
      await PersonAssetServices.create(personAssetData);

      // Update the checkoutStatus of the SerializedAsset to true
      await SerializedAssetServices.updateCheckoutStatus(
        newPersonAsset.value.serializedAssetId.key,
        true
      );

      // Send admin notification email
      notificationSender.value.sendEmail(
        {
          checkOutBy: personAssetData.checkedOutBy,
          fullName: newPersonAsset.value.personId.title,
          expectedCheckinDate: personAssetData.expectedCheckinDate,
          serializedAssetName: newPersonAsset.value.serializedAssetId.title,
        },
        "notify"
      );

      // Send confirmation email to the person
      notificationSender.value.sendEmail(
        {
          to: newPersonAsset.value.personId.email,
          fullName: newPersonAsset.value.personId.title,
          expectedCheckinDate: personAssetData.expectedCheckinDate,
          serializedAssetName: newPersonAsset.value.serializedAssetId.title,
        },
        "confirm"
      );

      snackbarText.value = "Asset checked out successfully!";
      snackbar.value = true;

      closePersonCheckoutDialog();
      await retrievePersonAssets();
      await retrieveSerializedAssets(); // Refresh serialized assets to reflect the checkout status update
    } catch (error) {
      console.error("Error saving checkout:", error);
      snackbarText.value = "Failed to check out the asset.";
      snackbar.value = true;
    }
  } else {
    snackbarText.value = "Please select both a person and an asset.";
    snackbar.value = true;
  }
};

const savePersonCheckin = async () => {
  if (newPersonAsset.value.personAssetId) {
    try {
      const checkinDateUtc = convertToUtcForStorage(new Date());

      const formattedCheckinDate = format(
        checkinDateUtc,
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      ); // Format the current date

      const selectedPersonAsset = personAssets.value.find(
        (pa) => pa.personAssetId === newPersonAsset.value.personAssetId
      );
      if (!selectedPersonAsset) {
        throw new Error("Selected asset not found.");
      }

      // Update the checkout status for both the PersonAsset and the SerializedAsset
      await PersonAssetServices.updateCheckoutStatusAndDate(
        selectedPersonAsset.personAssetId,
        false,
        formattedCheckinDate,
        checkedOutInByFullName // Pass the name of the user checking in the asset
      );
      await SerializedAssetServices.updateCheckoutStatus(
        selectedPersonAsset.serializedAssetId,
        false
      );

      // Send receipt email to the person
      notificationSender.value.sendEmail(
        {
          to: selectedPersonAsset.person.email,
          fullName: selectedPersonAsset.person.fullNameWithId,
          checkinDate: formattedCheckinDate,
          serializedAssetName:
            selectedPersonAsset.serializedAsset.serializedAssetName,
        },
        "receipt"
      );

      // Send admin notification email
      notificationSender.value.sendEmail(
        {
          checkedInBy: checkedOutInByFullName,
          fullName: selectedPersonAsset.person.fullNameWithId,
          expectedCheckinDate: formattedCheckinDate,
          serializedAssetName:
            selectedPersonAsset.serializedAsset.serializedAssetName,
        },
        "checkinNotify"
      );

      snackbarText.value = "Asset checked in successfully!";
      snackbar.value = true;
      closePersonCheckinDialog();
      await retrievePersonAssets();
      await retrieveSerializedAssets(); // Refresh to show updated statuses
    } catch (error) {
      console.error("Error saving check-in:", error);
      snackbarText.value = "Failed to check in the asset.";
      snackbar.value = true;
    }
  } else {
    snackbarText.value = "Please select an asset for check-in.";
    snackbar.value = true;
  }
};

const filteredPersonAssets = computed(() => {
  if (selectedStatus.value === "Checkout") {
    return personAssets.value.filter((asset) => asset.checkoutStatus === true);
  } else if (selectedStatus.value === "Check-in") {
    return personAssets.value.filter((asset) => asset.checkoutStatus === false);
  }
  return personAssets.value;
});

const closePersonCheckoutDialog = () => {
  showPersonCheckoutDialog.value = false;
  resetFields();
  newPersonAsset.value = {
    serializedAssetId: "",
    personId: "",
    checkoutDate: "",
    expectedCheckinDate: null,
  };
};

const closePersonCheckinDialog = () => {
  showPersonCheckinDialog.value = false;
  resetFields();
  // Reset the newPersonAsset values as well
  newPersonAsset.value = {
    serializedAssetId: "",
    personId: "",
    checkoutDate: "",
    checkoutStatus: "",
  };
  selectedPersonAsset.value = "";
};

// Define headers for the data table
const personAssetCheckoutHeaders = ref([
  { title: "Owner", key: "fullName" },
  { title: "Asset", key: "assetName" },
  { title: "Checked-out By", key: "checkedOutBy" },
  { title: "Expected Check-in Date", key: "expectedCheckinDate" },
  { title: "Checkout Date", key: "checkoutDate" },
]);

// Define headers for the data table
const personAssetCheckinHeaders = ref([
  { title: "Owner", key: "fullName" },
  { title: "Asset", key: "assetName" },
  { title: "Checked-in By", key: "checkedInBy" },
  { title: "Expected Check-in Date", key: "expectedCheckinDate" },
  { title: "Check-in Date", key: "checkinDate" },
]);

// Computed property for assets available for checkout (checkoutStatus = false)
const availableForCheckoutPersonAssets = computed(() => {
  return serializedAssets.value
    .filter((asset) => !asset.checkoutStatus) // Filter assets that are not checked out
    .sort((a, b) => {
      // Handle cases where serializedAssetName might be undefined or null
      const nameA = a.serializedAssetName || ""; // Default to empty string if serializedAssetName is undefined or null
      const nameB = b.serializedAssetName || ""; // Default to empty string if serializedAssetName is undefined or null
      return nameA.localeCompare(nameB); // Use localeCompare to sort by serializedAssetName
    });
});

// Computed property for assets available for check-in (checkoutStatus = true)
const availableForCheckinPersonAssets = computed(() => {
  return personAssets.value
    .filter((asset) => asset.checkoutStatus) // Filter assets that are checked out
    .sort((a, b) => new Date(b.checkoutDate) - new Date(a.checkoutDate)); // Sort by checkoutDate in descending order
});

// *** Buildings Section ***
// Retrieve Buildings from Database
const retrieveBuildings = async () => {
  try {
    const response = await BuildingServices.getAll();
    // Sort by name before updating buildings.value
    const sortedBuildings = response.data
      .filter((building) => building.activeStatus !== false) // Filter out archived buildings
      .map((building) => ({
        ...building,
        title: building.name, // Ensure name is used as title for consistency
        key: building.buildingId,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort buildings by name

    buildings.value = sortedBuildings;
  } catch (error) {
    console.error("Error loading buildings:", error);
  }
};

// Retrieve BuildingAssets from Database
const retrieveBuildingAssets = async () => {
  try {
    let response;
    // Check if the user's role category ID is 4
    if (userRole.value.data.categoryId === 4) {
      response = await BuildingAssetServices.getAll();
    } else {
      // Fetch building assets by specific category ID
      response = await BuildingAssetServices.getBuildingAssetsByCategoryId(
        userRole.value.data.categoryId
      );
    }

    // Process the response data
    buildingAssets.value = response.data.map((buildingAsset) => {
      const building = buildings.value.find(
        (b) => b.key === buildingAsset.buildingId
      );
      const serializedAsset = serializedAssets.value.find(
        (ba) => ba.key === buildingAsset.serializedAssetId
      );

      // Creating a combined title with building's name and asset's title
      const combinedTitle = `${
        building ? building.title : "Unknown Building"
      }: ${
        serializedAsset ? serializedAsset.serializedAssetName : "Unknown Asset"
      }`;

      return {
        ...buildingAsset,
        name: building ? building.title : "Unknown",
        assetName: serializedAsset
          ? serializedAsset.serializedAssetName
          : "Unknown Asset",
        title: combinedTitle, // Combined title
      };
    });
  } catch (error) {
    console.error("Error loading building assets:", error);
    message.value = "Failed to load building assets.";
  }
};

const saveBuildingCheckout = async () => {
  if (
    newBuildingAsset.value.buildingId &&
    newBuildingAsset.value.serializedAssetId
  ) {
    const checkoutDateUtc = convertToUtcForStorage(new Date());
    // Use the local time directly, formatting it to match the check-in formatting
    const formattedCheckoutDate = format(
      checkoutDateUtc,
      "yyyy-MM-dd'T'HH:mm:ss'Z'"
    );

    let checkinDate = null;
    if (!indefiniteCheckout.value && expectedCheckinDate.value) {
      // Since you're already using local time for checkout, ensure that expected check-in date handling is consistent
      checkinDate = format(new Date(expectedCheckinDate.value), "MMM dd, yyyy");
    }

    const buildingAssetData = {
      serializedAssetId: newBuildingAsset.value.serializedAssetId.key,
      buildingId: newBuildingAsset.value.buildingId.key,
      checkoutDate: formattedCheckoutDate,
      checkoutStatus: true,
      expectedCheckinDate: checkinDate,
      checkedOutBy: checkedOutInByFullName,
    };

    try {
      // Create new BuildingAsset record
      await BuildingAssetServices.create(buildingAssetData);

      // Update the checkoutStatus of the SerializedAsset to true
      await SerializedAssetServices.updateCheckoutStatus(
        newBuildingAsset.value.serializedAssetId.key,
        true
      );

      snackbarText.value = "Asset checked out successfully!";
      snackbar.value = true;

      closeBuildingCheckoutDialog();
      await retrieveBuildingAssets();
      await retrieveSerializedAssets(); // Refresh serialized assets to reflect the checkout status update
    } catch (error) {
      console.error("Error saving checkout:", error);
      snackbarText.value = "Failed to check out the asset.";
      snackbar.value = true;
    }
  } else {
    snackbarText.value = "Please select both a building and an asset.";
    snackbar.value = true;
  }
};

const saveBuildingCheckin = async () => {
  if (newBuildingAsset.value.buildingAssetId) {
    try {
      const checkinDateUtc = convertToUtcForStorage(new Date());

      const formattedCheckinDate = format(
        checkinDateUtc,
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      ); // Format the current date

      const selectedBuildingAsset = buildingAssets.value.find(
        (ba) => ba.buildingAssetId === newBuildingAsset.value.buildingAssetId
      );
      if (!selectedBuildingAsset) {
        throw new Error("Selected asset not found.");
      }

      // Update the checkout status for both the BuildingAsset and the SerializedAsset
      await BuildingAssetServices.updateCheckoutStatusAndDate(
        selectedBuildingAsset.buildingAssetId,
        false,
        formattedCheckinDate,
        checkedOutInByFullName // Pass the name of the user checking in the asset
      );
      await SerializedAssetServices.updateCheckoutStatus(
        selectedBuildingAsset.serializedAssetId,
        false
      );

      snackbarText.value = "Asset checked in successfully!";
      snackbar.value = true;
      closeBuildingCheckinDialog();
      await retrieveBuildingAssets();
      await retrieveSerializedAssets(); // Refresh to show updated statuses
    } catch (error) {
      console.error("Error saving check-in:", error);
      snackbarText.value = "Failed to check in the asset.";
      snackbar.value = true;
    }
  } else {
    snackbarText.value = "Please select an asset for check-in.";
    snackbar.value = true;
  }
};

const filteredBuildingAssets = computed(() => {
  if (selectedStatus.value === "Checkout") {
    return buildingAssets.value.filter(
      (asset) => asset.checkoutStatus === true
    );
  } else if (selectedStatus.value === "Check-in") {
    return buildingAssets.value.filter(
      (asset) => asset.checkoutStatus === false
    );
  }
  return buildingAssets.value;
});

const openAddNewPersonDialog = () => {
  message.value = "";
  showAddNewPersonDialog.value = true;
};

const closeAddNewPersonDialog = () => {
  showAddNewPersonDialog.value = false;
  messageText.value = "";
  idNumber.value = "";
  email.value = "";
  newPerson.value = {
    fName: "",
    lName: "",
    email: "",
    idNumber: "",
    roomId: null,
    activeStatus: true,
  };
};

const closeBuildingCheckoutDialog = () => {
  showBuildingCheckoutDialog.value = false;
  resetFields();
  newBuildingAsset.value = {
    serializedAssetId: "",
    buildingId: "",
    checkoutDate: "",
    expectedCheckinDate: null,
  };
};

const closeBuildingCheckinDialog = () => {
  showBuildingCheckinDialog.value = false;
  resetFields();
  // Reset the newBuildingAsset values as well
  newBuildingAsset.value = {
    serializedAssetId: "",
    buildingId: "",
    checkoutDate: "",
    checkoutStatus: "",
  };
  selectedBuildingAsset.value = "";
};

// Define headers for the data table
const buildingAssetCheckoutHeaders = ref([
  { title: "Building", key: "name" },
  { title: "Asset", key: "assetName" },
  { title: "Checked-out By", key: "checkedOutBy" },
  { title: "Expected Check-in Date", key: "expectedCheckinDate" },
  { title: "Checkout Date", key: "checkoutDate" },
]);

// Define headers for the data table
const buildingAssetCheckinHeaders = ref([
  { title: "Building", key: "name" },
  { title: "Asset", key: "assetName" },
  { title: "Checked-in By", key: "checkedInBy" },
  { title: "Expected Check-in Date", key: "expectedCheckinDate" },
  { title: "Check-in Date", key: "checkinDate" },
]);

// Computed property for assets available for checkout (checkoutStatus = false)
const availableForCheckoutBuildingAssets = computed(() => {
  return serializedAssets.value
    .filter((asset) => !asset.checkoutStatus) // Filter assets that are not checked out
    .sort((a, b) => {
      const nameA = a.serializedAssetName || ""; // Default to empty string if serializedAssetName is undefined or null
      const nameB = b.serializedAssetName || ""; // Default to empty string if serializedAssetName is undefined or null
      return nameA.localeCompare(nameB); // Use localeCompare to sort by serializedAssetName
    });
});

// Computed property for assets available for check-in (checkoutStatus = true)
const availableForCheckinBuildingAssets = computed(() => {
  return buildingAssets.value
    .filter((asset) => asset.checkoutStatus) // Filter assets that are checked out
    .sort((a, b) => new Date(b.checkoutDate) - new Date(a.checkoutDate)); // Sort by checkoutDate in descending order
});

// *** Rooms Section ***

// Retrieve Rooms from Database
const retrieveRooms = async () => {
  try {
    const response = await RoomServices.getAll();
    // Sort by roomName before updating rooms.value
    const sortedRooms = response.data
      .filter((room) => room.activeStatus !== false) // Filter out archived rooms
      .map((room) => ({
        ...room,
        title: room.roomName, // Ensure roomName is used as title for consistency
        key: room.roomId,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort rooms by roomName

    rooms.value = sortedRooms;
  } catch (error) {
    console.error("Error loading rooms:", error);
  }
};

const retrieveRoomAssets = async () => {
  try {
    let response;
    // Check if the user's role category ID is 4
    if (userRole.value.data.categoryId === 4) {
      response = await RoomAssetServices.getAll();
    } else {
      // Fetch room assets by specific category ID
      response = await RoomAssetServices.getRoomAssetsByCategoryId(
        userRole.value.data.categoryId
      );
    }

    // Process the response data
    roomAssets.value = response.data.map((roomAsset) => {
      const room = rooms.value.find((r) => r.key === roomAsset.roomId);
      const serializedAsset = serializedAssets.value.find(
        (ra) => ra.key === roomAsset.serializedAssetId
      );

      // Creating a combined title with room's name and asset's title
      const combinedTitle = `${room ? room.title : "Unknown Room"}: ${
        serializedAsset ? serializedAsset.serializedAssetName : "Unknown Asset"
      }`;

      return {
        ...roomAsset,
        name: room ? room.title : "Unknown",
        assetName: serializedAsset
          ? serializedAsset.serializedAssetName
          : "Unknown Asset",
        title: combinedTitle, // Combined title
      };
    });
  } catch (error) {
    console.error("Error loading room assets:", error);
    message.value = "Failed to load room assets.";
  }
};

const saveRoomCheckout = async () => {
  if (newRoomAsset.value.roomId && newRoomAsset.value.serializedAssetId) {
    const checkoutDateUtc = convertToUtcForStorage(new Date());
    // Use the local time directly, formatting it to match the check-in formatting
    const formattedCheckoutDate = format(
      checkoutDateUtc,
      "yyyy-MM-dd'T'HH:mm:ss'Z'"
    );

    let checkinDate = null;
    if (!indefiniteCheckout.value && expectedCheckinDate.value) {
      // Since you're already using local time for checkout, ensure that expected check-in date handling is consistent
      checkinDate = format(new Date(expectedCheckinDate.value), "MMM dd, yyyy");
    }

    const roomAssetData = {
      serializedAssetId: newRoomAsset.value.serializedAssetId.key,
      roomId: newRoomAsset.value.roomId.key,
      checkoutDate: formattedCheckoutDate,
      checkoutStatus: true,
      expectedCheckinDate: checkinDate,
      checkedOutBy: checkedOutInByFullName,
    };

    try {
      // Create new RoomAsset record
      await RoomAssetServices.create(roomAssetData);

      // Update the checkoutStatus of the SerializedAsset to true
      await SerializedAssetServices.updateCheckoutStatus(
        newRoomAsset.value.serializedAssetId.key,
        true
      );

      snackbarText.value = "Asset checked out successfully!";
      snackbar.value = true;

      closeRoomCheckoutDialog();
      await retrieveRoomAssets();
      await retrieveSerializedAssets(); // Refresh serialized assets to reflect the checkout status update
    } catch (error) {
      console.error("Error saving checkout:", error);
      snackbarText.value = "Failed to check out the asset.";
      snackbar.value = true;
    }
  } else {
    snackbarText.value = "Please select both a room and an asset.";
    snackbar.value = true;
  }
};

const saveRoomCheckin = async () => {
  if (newRoomAsset.value.roomAssetId) {
    try {
      const checkinDateUtc = convertToUtcForStorage(new Date());

      const formattedCheckinDate = format(
        checkinDateUtc,
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      ); // Format the current date

      const selectedRoomAsset = roomAssets.value.find(
        (ra) => ra.roomAssetId === newRoomAsset.value.roomAssetId
      );
      if (!selectedRoomAsset) {
        throw new Error("Selected asset not found.");
      }

      // Update the checkout status for both the RoomAsset and the SerializedAsset
      await RoomAssetServices.updateCheckoutStatusAndDate(
        selectedRoomAsset.roomAssetId,
        false,
        formattedCheckinDate,
        checkedOutInByFullName // Pass the name of the user checking in the asset
      );
      await SerializedAssetServices.updateCheckoutStatus(
        selectedRoomAsset.serializedAssetId,
        false
      );

      snackbarText.value = "Asset checked in successfully!";
      snackbar.value = true;
      closeRoomCheckinDialog();
      await retrieveRoomAssets();
      await retrieveSerializedAssets(); // Refresh to show updated statuses
    } catch (error) {
      console.error("Error saving check-in:", error);
      snackbarText.value = "Failed to check in the asset.";
      snackbar.value = true;
    }
  } else {
    snackbarText.value = "Please select an asset for check-in.";
    snackbar.value = true;
  }
};

const filteredRoomAssets = computed(() => {
  if (selectedStatus.value === "Checkout") {
    return roomAssets.value.filter((asset) => asset.checkoutStatus === true);
  } else if (selectedStatus.value === "Check-in") {
    return roomAssets.value.filter((asset) => asset.checkoutStatus === false);
  }
  return roomAssets.value;
});

const closeRoomCheckoutDialog = () => {
  showRoomCheckoutDialog.value = false;
  resetFields();
  newRoomAsset.value = {
    serializedAssetId: "",
    roomId: "",
    checkoutDate: "",
    expectedCheckinDate: null,
  };
};

const closeRoomCheckinDialog = () => {
  showRoomCheckinDialog.value = false;
  resetFields();
  // Reset the newRoomAsset values as well
  newRoomAsset.value = {
    serializedAssetId: "",
    roomId: "",
    checkoutDate: "",
    checkoutStatus: "",
  };
  selectedRoomAsset.value = "";
};

// Define headers for the data table
const roomAssetCheckoutHeaders = ref([
  { title: "Room", key: "name" },
  { title: "Asset", key: "assetName" },
  { title: "Checked-out By", key: "checkedOutBy" },
  { title: "Expected Check-in Date", key: "expectedCheckinDate" },
  { title: "Checkout Date", key: "checkoutDate" },
]);

// Define headers for the data table
const roomAssetCheckinHeaders = ref([
  { title: "Room", key: "name" },
  { title: "Asset", key: "assetName" },
  { title: "Checked-in By", key: "checkedInBy" },
  { title: "Expected Check-in Date", key: "expectedCheckinDate" },
  { title: "Check-in Date", key: "checkinDate" },
]);

// Computed property for assets available for checkout (checkoutStatus = false)
const availableForCheckoutRoomAssets = computed(() => {
  return serializedAssets.value
    .filter((asset) => !asset.checkoutStatus) // Filter assets that are not checked out
    .sort((a, b) => {
      const nameA = a.serializedAssetName || ""; // Default to empty string if serializedAssetName is undefined or null
      const nameB = b.serializedAssetName || ""; // Default to empty string if serializedAssetName is undefined or null
      return nameA.localeCompare(nameB); // Use localeCompare to sort by serializedAssetName
    });
});

// Computed property for assets available for check-in (checkoutStatus = true).
const availableForCheckinRoomAssets = computed(() => {
  return roomAssets.value
    .filter((asset) => asset.checkoutStatus) // Filter assets that are checked out
    .sort((a, b) => new Date(b.checkoutDate) - new Date(a.checkoutDate)); // Sort by checkoutDate in descending order
});

// *** Misc Section ***

// Retrieve SerializedAssets from Database
const retrieveSerializedAssets = async () => {
  try {
    let response;
    // Check if the user's role category ID is 4
    if (userRole.value.data.categoryId === 4) {
      response = await SerializedAssetServices.getAll();
    } else {
      // Fetch assets by specific category ID
      response = await SerializedAssetServices.getSerializedAssetsByCategoryId(
        userRole.value.data.categoryId
      );
    }

    // Process the response data
    serializedAssets.value = response.data
      .filter((asset) => asset.activeStatus !== false) // Filter out archived assets
      .map((serializedAsset) => {
        const profile = assetProfiles.value.find(
          (t) => t.key === serializedAsset.profileId
        );
        return {
          ...serializedAsset,
          title: serializedAsset.serializedAssetName,
          profileName: profile ? profile.profileName : "Unknown Profile",
          key: serializedAsset.serializedAssetId,
        };
      });
  } catch (error) {
    console.error("Error loading serialized assets:", error);
    message.value = "Failed to load serializedAssets.";
  }
};

const translateStatus = (status) => {
  return status ? "Checked Out" : "Checked In";
};

const formatDate = (dateString) => {
  if (!dateString) return "Indefinite";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY - h:mm A");
};

const formatExpectedDate = (dateString) => {
  if (!dateString) return "Indefinite";
  // Parse the date as UTC and format it
  return moment.utc(dateString).format("MMM DD, YYYY");
};

// Function to convert a date from Central Time Zone to UTC
const convertToUtcForStorage = (localDate) => {
  const timeZone = "America/Chicago"; // Adjust to your local time zone as needed
  return zonedTimeToUtc(localDate, timeZone);
};

// Computed property for display
const formattedCheckinDate = computed(() => {
  if (expectedCheckinDate.value) {
    return format(new Date(expectedCheckinDate.value), "MMM dd, yyyy");
  }
  return "";
});

const resetFields = () => {
  // Reset date related stuff
  expectedCheckinDate.value = null;
  indefiniteCheckout.value = true;
  // Reset the from validation
  checkoutFormValid.value = false;
  checkinFormValid.value = false;
};

// A computed property that combines tab and status
const tabAndStatus = computed(() => {
  return { tab: selectedTab.value, status: selectedStatus.value };
});

// Watcher for both selectedTab and selectedStatus
watch(
  tabAndStatus,
  async (current) => {
    switch (current.tab) {
      case "People":
        await retrieveSerializedAssets();
        await retrievePeople();
        await retrievePersonAssets();
        break;
      case "Buildings":
        await retrieveSerializedAssets();
        await retrieveBuildings();
        await retrieveBuildingAssets();
        break;
      case "Rooms":
        await retrieveSerializedAssets();
        await retrieveRooms();
        await retrieveRoomAssets();
        break;
      default:
        console.error("Unknown tab:", current.tab);
    }
  },
  { immediate: true }
);

// Watcher for checkin dialog v-auto
watch(
  selectedPersonAsset,
  (newValue) => {
    // Check if newValue is not null before trying to access its properties
    if (newValue && newValue.personAssetId) {
      newPersonAsset.value.personAssetId = newValue.personAssetId;
    } else {
      // If newValue is null, reset newPersonAsset.value.personAssetId to a default value
      newPersonAsset.value.personAssetId = "";
    }
  },
  { immediate: true, deep: true }
);

watch(
  selectedBuildingAsset,
  (newValue) => {
    // Check if newValue is not null before trying to access its properties
    if (newValue && newValue.buildingAssetId) {
      newBuildingAsset.value.buildingAssetId = newValue.buildingAssetId;
    } else {
      // If newValue is null, reset newBuildingAsset.value.buildingAssetId to a default value
      newBuildingAsset.value.buildingAssetId = "";
    }
  },
  { immediate: true, deep: true }
);

watch(
  selectedRoomAsset,
  (newValue) => {
    // Check if newValue is not null before trying to access its properties
    if (newValue && newValue.roomAssetId) {
      newRoomAsset.value.roomAssetId = newValue.roomAssetId;
    } else {
      // If newValue is null, reset newRoomAsset.value.roomAssetId to a default value
      newRoomAsset.value.roomAssetId = "";
    }
  },
  { immediate: true, deep: true }
);

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await getUserRole();
  await retrieveSerializedAssets();
  await retrievePeople();
  await retrievePersonAssets();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> Asset Check-Out/In </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="selectedTab" background-color="primary" dark dense>
            <v-tab value="People" color="primary">
              <v-icon left class="mr-2">mdi-account-multiple</v-icon>
              People
            </v-tab>
            <v-tab value="Rooms" color="primary">
              <v-icon left class="mr-2">mdi-door</v-icon>
              Rooms
            </v-tab>
            <v-tab value="Buildings" color="primary">
              <v-icon left class="mr-2">mdi-domain</v-icon>
              Buildings
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs
            v-model="selectedStatus"
            background-color="primary"
            dark
            dense
          >
            <v-tab value="Checkout" color="primary">
              <v-icon left class="mr-2">mdi-debug-step-out</v-icon>
              Checkout
            </v-tab>
            <v-tab value="Check-in" color="primary">
              <v-icon left class="mr-2">mdi-debug-step-into</v-icon>
              Check-in
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- *** People Checkout Section *** -->
            <div
              v-if="selectedTab === 'People' && selectedStatus === 'Checkout'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Recent Person Checkouts</span>
                  <v-btn
                    color="saveblue"
                    class="ma-2"
                    @click="showPersonCheckoutDialog = true"
                  >
                    Checkout
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="personAssetCheckoutHeaders"
                    :items="filteredPersonAssets"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="checkoutSortBy"
                  >
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
                    </template>
                    <template v-slot:item.checkoutDate="{ item }">
                      <td>{{ formatDate(item.checkoutDate) }}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- *** People Check-in Section *** -->
            <div
              v-if="selectedTab === 'People' && selectedStatus === 'Check-in'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Recent Person Check-ins</span>
                  <v-btn
                    color="saveblue"
                    class="ma-2"
                    @click="showPersonCheckinDialog = true"
                  >
                    Check-in
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="personAssetCheckinHeaders"
                    :items="filteredPersonAssets"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="checkinSortBy"
                  >
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
                    </template>
                    <template v-slot:item.checkinDate="{ item }">
                      <td>{{ formatDate(item.checkinDate) }}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- *** Buildings Checkout Section *** -->
            <div
              v-if="
                selectedTab === 'Buildings' && selectedStatus === 'Checkout'
              "
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Recent Building Checkouts</span>
                  <v-btn
                    color="saveblue"
                    class="ma-2"
                    @click="showBuildingCheckoutDialog = true"
                  >
                    Checkout
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="buildingAssetCheckoutHeaders"
                    :items="filteredBuildingAssets"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="checkoutSortBy"
                  >
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
                    </template>
                    <template v-slot:item.checkoutDate="{ item }">
                      <td>{{ formatDate(item.checkoutDate) }}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- *** Buildings Check-in Section *** -->
            <div
              v-if="
                selectedTab === 'Buildings' && selectedStatus === 'Check-in'
              "
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Recent Building Check-ins</span>
                  <v-btn
                    color="saveblue"
                    class="ma-2"
                    @click="showBuildingCheckinDialog = true"
                  >
                    Check-in
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="buildingAssetCheckinHeaders"
                    :items="filteredBuildingAssets"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="checkinSortBy"
                  >
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
                    </template>
                    <template v-slot:item.checkinDate="{ item }">
                      <td>{{ formatDate(item.checkinDate) }}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- *** Rooms Checkout Section *** -->
            <div
              v-if="selectedTab === 'Rooms' && selectedStatus === 'Checkout'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Recent Room Checkouts</span>
                  <v-btn
                    color="saveblue"
                    class="ma-2"
                    @click="showRoomCheckoutDialog = true"
                  >
                    Checkout
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="roomAssetCheckoutHeaders"
                    :items="filteredRoomAssets"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="checkoutSortBy"
                  >
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
                    </template>
                    <template v-slot:item.checkoutDate="{ item }">
                      <td>{{ formatDate(item.checkoutDate) }}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- *** Rooms Check-in Section *** -->
            <div
              v-if="selectedTab === 'Rooms' && selectedStatus === 'Check-in'"
            >
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Recent Room Check-ins</span>
                  <v-btn
                    color="saveblue"
                    class="ma-2"
                    @click="showRoomCheckinDialog = true"
                  >
                    Check-in
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="roomAssetCheckinHeaders"
                    :items="filteredRoomAssets"
                    class="elevation-1"
                    :items-per-page="5"
                    :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="checkinSortBy"
                  >
                    <template v-slot:item.expectedCheckinDate="{ item }">
                      <td>
                        {{ formatExpectedDate(item.expectedCheckinDate) }}
                      </td>
                    </template>
                    <template v-slot:item.checkinDate="{ item }">
                      <td>{{ formatDate(item.checkinDate) }}</td>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>
          </v-fade-transition>
        </v-col>
      </v-row>
    </v-container>

    <!-- *** Person Checkout Dialog *** -->
    <v-dialog v-model="showPersonCheckoutDialog" persistent max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline">Checkout Asset</span>
        </v-card-title>
        <v-form ref="personCheckoutForm" v-model="checkoutFormValid">
          <v-card-text>
            <v-container id="attach">
              <v-row>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Person"
                    v-model="newPersonAsset.personId"
                    :items="people"
                    variant="outlined"
                    item-text="title"
                    item-value="key"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-account"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Asset"
                    v-model="newPersonAsset.serializedAssetId"
                    :items="availableForCheckoutPersonAssets"
                    item-text="title"
                    variant="outlined"
                    item-value="key"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-cellphone-settings"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    v-model="indefiniteCheckout"
                    label="Indefinite Checkout"
                  ></v-checkbox>
                </v-col>
                <v-col cols="12" v-if="!indefiniteCheckout">
                  <v-menu
                    v-model="menu"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="formattedCheckinDate"
                        label="Expected Check-in Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="menu = !menu"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="expectedCheckinDate"
                      @input="menu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="green" text @click="openAddNewPersonDialog">
              Add New Person</v-btn
            >
            <v-btn color="cancelgrey" text @click="closePersonCheckoutDialog"
              >Cancel</v-btn
            >
            <v-btn
              color="saveblue"
              class="ma-2"
              text
              @click="savePersonCheckout"
              :disabled="!checkoutFormValid"
              >Checkout</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- *** Add New Person Dialog *** -->
    <v-dialog v-model="showAddNewPersonDialog" persistet max-width="600px">
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
            <v-btn color="cancelgrey" text @click="closeAddNewPersonDialog"
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
    </v-dialog>

    <!-- *** Person Checkin Dialog *** -->
    <v-dialog v-model="showPersonCheckinDialog" persistent max-width="600px">
      <v-card class="rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline">Check-in Asset</span>
        </v-card-title>
        <v-form ref="personCheckinForm" v-model="checkinFormValid">
          <v-card-text>
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Asset for Check-in"
                    v-model="selectedPersonAsset"
                    variant="outlined"
                    :items="availableForCheckinPersonAssets"
                    item-text="formatPersonAssetText"
                    item-value="personAssetId"
                    :rules="[rules.required]"
                    return-object
                    clearable
                  ></v-autocomplete>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="cancelgrey" text @click="closePersonCheckinDialog"
              >Cancel</v-btn
            >
            <v-btn
              color="saveblue"
              class="ma-2"
              text
              @click="savePersonCheckin"
              :disabled="!checkinFormValid"
              >Check-in</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- *** Building Checkout Dialog *** -->
    <v-dialog v-model="showBuildingCheckoutDialog" persistent max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline">Checkout Asset</span>
        </v-card-title>
        <v-form ref="buildingCheckoutForm" v-model="checkoutFormValid">
          <v-card-text>
            <v-container id="attach">
              <v-row>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Building"
                    v-model="newBuildingAsset.buildingId"
                    :items="buildings"
                    variant="outlined"
                    item-text="title"
                    item-value="key"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-account"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Asset"
                    v-model="newBuildingAsset.serializedAssetId"
                    :items="availableForCheckoutBuildingAssets"
                    variant="outlined"
                    item-text="title"
                    item-value="key"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-cellphone-settings"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    v-model="indefiniteCheckout"
                    label="Indefinite Checkout"
                  ></v-checkbox>
                </v-col>
                <v-col cols="12" v-if="!indefiniteCheckout">
                  <v-menu
                    v-model="menu"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="formattedCheckinDate"
                        label="Expected Check-in Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="menu = !menu"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="expectedCheckinDate"
                      @input="menu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="cancelgrey" text @click="closeBuildingCheckoutDialog"
              >Cancel</v-btn
            >
            <v-btn
              color="saveblue"
              class="ma-2"
              text
              @click="saveBuildingCheckout"
              :disabled="!checkoutFormValid"
              >Checkout</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- *** Building Checkin Dialog *** -->
    <v-dialog v-model="showBuildingCheckinDialog" persistent max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title>
          <span class="headline">Check-in Asset</span>
        </v-card-title>
        <v-form ref="buildingCheckinForm" v-model="checkinFormValid">
          <v-card-text>
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Asset for Check-in"
                    v-model="selectedBuildingAsset"
                    :items="availableForCheckinBuildingAssets"
                    variant="outlined"
                    item-text="title"
                    item-value="buildingAssetId"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-cellphone-settings"
                  ></v-autocomplete>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="cancelgrey" text @click="closeBuildingCheckinDialog"
              >Cancel</v-btn
            >
            <v-btn
              color="saveblue"
              class="ma-2"
              text
              @click="saveBuildingCheckin"
              :disabled="!checkinFormValid"
              >Check-in</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- *** Room Checkout Dialog *** -->
    <v-dialog v-model="showRoomCheckoutDialog" persistent max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          <span class="headline">Checkout Asset</span>
        </v-card-title>
        <v-form ref="roomCheckoutForm" v-model="checkoutFormValid">
          <v-card-text>
            <v-container id="attach">
              <v-row>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Room"
                    v-model="newRoomAsset.roomId"
                    :items="rooms"
                    variant="outlined"
                    item-text="title"
                    item-value="key"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-account"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Asset"
                    v-model="newRoomAsset.serializedAssetId"
                    :items="availableForCheckoutRoomAssets"
                    variant="outlined"
                    item-text="title"
                    item-value="key"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-cellphone-settings"
                  ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    v-model="indefiniteCheckout"
                    label="Indefinite Checkout"
                  ></v-checkbox>
                </v-col>
                <v-col cols="12" v-if="!indefiniteCheckout">
                  <v-menu
                    v-model="menu"
                    attach="#attach"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    min-width="auto"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="formattedCheckinDate"
                        label="Expected Check-in Date"
                        variant="outlined"
                        prepend-icon="mdi-calendar"
                        :rules="[rules.required]"
                        readonly
                        v-bind="attrs"
                        @click="menu = !menu"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="expectedCheckinDate"
                      @input="menu = false"
                      color="primary"
                    ></v-date-picker>
                  </v-menu>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="cancelgrey" text @click="closeRoomCheckoutDialog"
              >Cancel</v-btn
            >
            <v-btn
              color="saveblue"
              class="ma-2"
              text
              @click="saveRoomCheckout"
              :disabled="!checkoutFormValid"
              >Checkout</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- *** Room Checkin Dialog *** -->
    <v-dialog v-model="showRoomCheckinDialog" persistent max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title>
          <span class="headline">Check-in Asset</span>
        </v-card-title>
        <v-form ref="roomCheckinForm" v-model="checkinFormValid">
          <v-card-text>
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-autocomplete
                    label="Select Asset for Check-in"
                    v-model="selectedRoomAsset"
                    :items="availableForCheckinRoomAssets"
                    variant="outlined"
                    item-text="title"
                    item-value="roomAssetId"
                    :rules="[rules.required]"
                    return-object
                    clearable
                    prepend-icon="mdi-cellphone-settings"
                  ></v-autocomplete>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="cancelgrey" text @click="closeRoomCheckinDialog"
              >Cancel</v-btn
            >
            <v-btn
              color="saveblue"
              class="ma-2"
              text
              @click="saveRoomCheckin"
              :disabled="!checkinFormValid"
              >Check-in</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>

    <NotificationSender ref="notificationSender" />
  </div>
</template>
