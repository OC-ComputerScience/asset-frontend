<script setup>
import { ref, watch, computed, onMounted } from "vue";
import Utils from "../config/utils";
import userServices from "../services/userServices";
import userRoleServices from "../services/userRoleServices";
import assetCategoryServices from "../services/assetCategoryServices";


// Refs for current user
const currentUser = ref([]);
currentUser.value = Utils.getStore("user");


// Refs for Users tab
const users = ref([]);
const userRoles = ref([]);
const assetCategories = ref([]);
const roleNames = ref([]);
const roleNameToIdMap = ref({});
const changedUserRoles = ref({});
const snackbar = ref(false);
const snackbarText = ref("");
const usersSortBy = ref([{ key: "fName", order: "asc" }]);
const userRolesSortBy = ref([{ key: "name", order: "asc" }]);
const searchQuery = ref("");
const showSaveAllConfirmDialog = ref(false);

// Refs for User Roles tab
const roles = ref([]);
const newUserRole = ref({
  name: "",
  categoryId: null,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canArchive: false,
  canActivate: false,
  viewCheckOutIn: false,
  viewServices: false,
  viewMaintenance: false,
  viewWarranties: false,
  viewLeases: false,
  viewReports: false,
  viewManage: false,
  viewAssets: false,
  viewFacilities: false,
  viewPeople: false,
  viewUsers: false,
  isAdmin: false,
  isManager: false,
  isWorker: false,
  isUnassigned: false
});
const originalUserRole = ref({});

const pickRole = ref([]);
watch(pickRole, (newRole) => {
  newUserRole.value.isAdmin = newRole === 'isAdmin';
  newUserRole.value.isManager = newRole === 'isManager';
  newUserRole.value.isWorker = newRole === 'isWorker';
});

const editingUserRole = ref(false);
const showAddUserRoleDialog = ref(false);
const validUserRole = ref(false);
const rules = {
  required: (value) => !!value || "Required.",
  maxNameLength: (value) =>
    value.length <= 40 || "Name cannot exceed 40 characters",
};
const showServices = ref(true);
const showManage = ref(true);

// Refs for general use
const selectedTab = ref("Users");
const isUsersTabActive = computed(() => selectedTab.value === "Users");
const isUserRolesTabActive = computed(() => selectedTab.value === "User Roles");

// User Roles Section

const fetchUsersAndRoles = async () => {
  try {
    const [usersResponse, rolesResponse] = await Promise.all([
      userServices.getAll(),
      userRoleServices.getAll(),
    ]);

    users.value = usersResponse.data;
    userRoles.value = rolesResponse.data;

    if (currentUser.value.categoryId != 4) {
      users.value = users.value.filter(user => user.userRole.categoryId === currentUser.value.categoryId || user.userRole.name === 'Unassigned');
    }

    const rolesFiltered = ref([]);
    rolesFiltered.value = rolesResponse.data;
    if (currentUser.value.categoryId != 4) {
      rolesFiltered.value = rolesFiltered.value.filter(role => role.categoryId === currentUser.value.categoryId || role.name === 'Unassigned');
    }

    // Populate and sort roleNames
    roleNames.value = rolesFiltered.value
      .map((role) => role.name)
      .sort((a, b) => a.localeCompare(b)); // Sorting the role names alphabetically


    roleNameToIdMap.value = rolesResponse.data.reduce((map, role) => {
      map[role.name] = role.id;
      return map;
    }, {});

    // Initialize each user's selectedRoleName with their current role name
    users.value = users.value.map((user) => {
      const userRole = userRoles.value.find(
        (role) => role.id === user.userRoleId
      );
      user.selectedRoleName = userRole ? userRole.name : null;
      return user;
    });
  } catch (error) {
    console.error("Failed to fetch users or roles:", error);
  }
};

// Batch update function
const saveAllUserRoleChanges = async () => {
  const updatePromises = Object.entries(changedUserRoles.value).map(
    ([userId, roleId]) => {
      return userServices.updateRole(userId, roleId);
    }
  );

  try {
    await Promise.all(updatePromises);
    snackbarText.value = "All role changes updated successfully";
    snackbar.value = true;
    fetchUsersAndRoles(); // Refresh data
    showSaveAllConfirmDialog.value = false;
    changedUserRoles.value = {}; // Reset role changes tracker
  } catch (error) {
    console.error("Failed to update role changes:", error);
    snackbarText.value = "Failed to update role changes";
    snackbar.value = true;
  }
};

const filteredUsers = computed(() => {
  if (!searchQuery.value) {
    return users.value;
  }
  return users.value.filter((user) =>
    `${user.fName} ${user.lName}`
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  );
});

const scrollToUser = () => {
  // This assumes user names are unique or you're okay with scrolling to the first match
  const userFullName = searchQuery.value.toLowerCase();
  const userElement = document.querySelector(
    `[data-user-name="${userFullName}"]`
  );

  if (userElement) {
    userElement.scrollIntoView({ behavior: "smooth" });
  }
};

const highlightedUsers = ref([]);
watch(
  [filteredUsers, searchQuery],
  ([newFilteredUsers]) => {
    highlightedUsers.value = newFilteredUsers.map((user) => {
      const fName = user.fName || ""; // Default to empty string if null
      const lName = user.lName || "";
      return {
        ...user,
        fullName: `${highlightText(fName)} ${highlightText(lName)}`, // Ensure null-safe operation
      };
    });
  },
  { deep: true, immediate: true }
);

const highlightText = (text) => {
  if (!text) return ""; // Return empty string if text is null or undefined
  const lowerSearchQuery = searchQuery.value
    ? searchQuery.value.toLowerCase()
    : "";
  if (!lowerSearchQuery) return text; // No query, return original text

  const regex = new RegExp(`(${lowerSearchQuery})`, "gi");
  return text.replace(regex, '<mark class="custom-highlight">$1</mark>'); // Apply custom highlight
};

// Computed property to check if there are changes
const hasChanges = computed(() => {
  return Object.keys(changedUserRoles.value).length > 0;
});

// Define headers for v-data-table.
const userHeaders = [
  { title: "Name", key: "fName" },
  { title: "Change Role", key: "selectedRoleName" },
];

// User Roles Section

const retrieveUserRoles = async () => {
  try {
    const response = await userRoleServices.getAll();
    roles.value = response.data;
  } catch (error) {
    console.error("Failed to retrieve user roles:", error);
  }
};

const editUserRole = (role) => {
  newUserRole.value = { ...role };
  originalUserRole.value = { ...role };
  editingUserRole.value = true;
  showAddUserRoleDialog.value = true;

  if (newUserRole.value.isAdmin) {
    pickRole.value = 'isAdmin';
  } else if (newUserRole.value.isManager) {
    pickRole.value = 'isManager';
  } else if (newUserRole.value.isWorker) {
    pickRole.value = 'isWorker';
  } else {
    pickRole.value = '';
  }
};

const saveUserRole = async () => {
  try {
    let isRoleUpdated = false;
    if (editingUserRole.value && newUserRole.value.id) {
      // Update existing user role
      await userRoleServices.update(newUserRole.value.id, newUserRole.value);
      isRoleUpdated = true;
      snackbarText.value = "Role updated successfully.";
    } else {
      // Add new user role
      await userRoleServices.create(newUserRole.value);
      snackbarText.value = "Role added successfully.";
    }

    if (isRoleUpdated) {
      updateUsersPermissions(newUserRole.value);
    }

    snackbar.value = true; // Show the snackbar
    showAddUserRoleDialog.value = false; // Close the dialog
    await retrieveUserRoles(); // Refresh the list of roles
    await fetchUsersAndRoles();
  } catch (error) {
    console.error("Failed to save user role:", error);
    snackbarText.value = "Failed to save user role: " + error.message;
    snackbar.value = true; // Show the snackbar even in case of error
  } finally {
    // Reset the form and state
    resetForm();
  }
};

const updateUsersPermissions = async (updatedRole) => {
  const updatePromises = users.value
    .filter((user) => user.userRoleId === updatedRole.id)
    .map((user) => {
      // Map each permission directly at the root level of the user object
      const updatedUserData = {
        ...user,
        canActivate: updatedRole.canActivate,
        canAdd: updatedRole.canAdd,
        canArchive: updatedRole.canArchive,
        canDelete: updatedRole.canDelete,
        canEdit: updatedRole.canEdit,
        viewCheckOutIn: updatedRole.viewCheckOutIn,
        viewServices: updatedRole.viewServices,
        viewMaintenance: updatedRole.viewMaintenance,
        viewWarranties: updatedRole.viewWarranties,
        viewLeases: updatedRole.viewLeases,
        viewReports: updatedRole.viewReports,
        viewManage: updatedRole.viewManage,
        viewAssets: updatedRole.viewAssets,
        viewFacilities: updatedRole.viewFacilities,
        viewPeople: updatedRole.viewPeople,
        viewUsers: updatedRole.viewUsers
        // Add other permissions as needed
      };

      // Call the update API
      return userServices.update(user.id, updatedUserData);
    });

  try {
    await Promise.all(updatePromises);
    snackbarText.value = "User permissions updated successfully.";
    snackbar.value = true;
  } catch (error) {
    console.error("Failed to update user permissions:", error);
    snackbarText.value = "Failed to update user permissions: " + error.message;
    snackbar.value = true;
  }
};

const hasUserRoleChanged = computed(() => {
  // Compare each property of newUserRole with originalUserRole to check for changes
  return Object.keys(newUserRole.value).some(
    (key) => newUserRole.value[key] !== originalUserRole.value[key]
  );
});

const closeUserRoleDialog = () => {
  showAddUserRoleDialog.value = false;
  originalUserRole.value = {}; // Reset the original user role
  newUserRole.value = {
    name: "",
    categoryId: null,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canArchive: false,
    canActivate: false,
    viewCheckOutIn: false,
    viewServices: false,
    viewMaintenance: false,
    viewWarranties: false,
    viewLeases: false,
    viewReports: false,
    viewManage: false,
    viewAssets: false,
    viewFacilities: false,
    viewPeople: false,
    viewUsers: false,
    isAdmin: false,
    isManager: false,
    isWorker: false,
    isUnassigned: false
  };
  editingUserRole.value = false; // Reset the editing state
};

// Define headers for v-data-table.
const userRoleHeaders = [
  { title: "Role Name", key: "name" },
  { title: "Actions", key: "actions", sortable: false },
];

// Misc Section
// Retrieve Categories from Database
const retrieveAssetCategories = async () => {
  try {
    const response = await assetCategoryServices.getAll();
    assetCategories.value = response.data.map((category) => ({
      ...category,
      title: category.categoryName,
      key: category.categoryId,
    }));
  } catch (error) {
    console.error("Error loading categories:", error);
  }
};

const resetForm = () => {
  newUserRole.value = {
    name: "",
    categoryId: null,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canArchive: false,
    canActivate: false,
    viewCheckOutIn: false,
    viewServices: false,
    viewMaintenance: false,
    viewWarranties: false,
    viewLeases: false,
    viewReports: false,
    viewManage: false,
    viewAssets: false,
    viewFacilities: false,
    viewPeople: false,
    viewUsers: false,
    isAdmin: false,
    isManager: false,
    isWorker: false,
    isUnassigned: false
  };
  validUserRole.value = false; // Reset validation state
  editingUserRole.value = false; // Ensure we're not in editing mode
};

function toggleServices() {
  showServices.value = !showServices.value;
}

function toggleManage() {
  showManage.value = !showManage.value;
}

// Watcher for the "Users" tab
watch(
  [highlightedUsers, isUsersTabActive],
  ([newUsers, isUsersActive]) => {
    if (isUsersActive) {
      newUsers.forEach((user) => {
        const selectedRoleId = roleNameToIdMap.value[user.selectedRoleName];
        if (selectedRoleId !== undefined) {
          if (selectedRoleId === user.userRoleId) {
            // If the selected role is the same as the original role, remove the change tracking for this user.
            if (changedUserRoles.value.hasOwnProperty(user.id)) {
              delete changedUserRoles.value[user.id];
            }
          } else {
            // Track the role change.
            changedUserRoles.value[user.id] = selectedRoleId;
          }
        }
      });
    }
  },
  { deep: true }
);

// Watcher for the "User Roles" tab
watch(isUserRolesTabActive, async (isActive) => {
  if (isActive) {
    await retrieveUserRoles();
  }
});

// Watcher for checkboxes variables in User Roles tab
watch(newUserRole, (newRole) => {

  //Checkbox related to Services
  //Check Services if at least one of its subcategories are checked
  if (newRole.viewMaintenance || newRole.viewLeases || newRole.viewWarranties) {
    newRole.viewServices = true;
  }
  //Uncheck Services if all its subcategories are unchecked
  if (!newRole.viewMaintenance & !newRole.viewLeases & !newRole.viewWarranties) {
    newRole.viewServices = false;
  }

  //Checkbox related to Manage
  //Check Manage if at least one of its subcategories are checked
  if (newRole.viewAssets || newRole.viewFacilities || newRole.viewPeople || newRole.viewUsers) {
    newRole.viewManage = true;
  }
  //Uncheck Manage if all its subcategories are unchecked
  if (!newRole.viewAssets & !newRole.viewFacilities & !newRole.viewPeople & !newRole.viewUsers) {
    newRole.viewManage = false;
  }

  // if (newRole.isAdmin) {
  //   newRole.isManager = false;
  //   newRole.isWorker = false;
  // }

  // if (newRole.isManager) {
  //   newRole.isAdmin = false;
  //   newRole.isWorker = false;
  // }

  // if (newRole.isWorker) {
  //   newRole.isAdmin = false;
  //   newRole.isManager = false;
  // }

}, { deep: true });

// Call this once to load the default tab's data when the component mounts
onMounted(async () => {
  await fetchUsersAndRoles();
  await retrieveUserRoles();
  await retrieveAssetCategories();
});
</script>

<template>
  <div>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-toolbar color="background">
            <v-toolbar-title> User Management </v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-divider style="width: 30%; height: 3px"></v-divider>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="selectedTab" background-color="primary" dark>
            <v-tab value="Users" color="primary">
              <v-icon left class="mr-2">mdi-account</v-icon>
              <!-- Icon for Users -->
              Users
            </v-tab>
            <v-tab value="User Roles" color="primary">
              <v-icon left class="mr-2">mdi-account-key</v-icon>
              <!-- Icon for User Roles -->
              User Roles
            </v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <div v-if="selectedTab === 'Users'">
        <v-col cols="12" md="8">
          <v-text-field v-model="searchQuery" label="Search by Name" variant="outlined" dense clearable
            @input="scrollToUser" class="pt-0"></v-text-field>
        </v-col>
      </div>
      <v-row>
        <v-col cols="12">
          <v-fade-transition mode="out-in">
            <!-- Users Section -->
            <div v-if="selectedTab === 'Users'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Role Assignment</span>
                  <v-btn color="saveblue" class="ma-2" @click="showSaveAllConfirmDialog = true" :disabled="!hasChanges">
                    Save All Changes
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="userHeaders" :items="highlightedUsers" item-key="id" class="elevation-1"
                    :items-per-page="5" :items-per-page-options="[5, 10, 20, 50, -1]" v-model:sort-by="usersSortBy">
                    <template v-slot:item="{ item }">
                      <tr :data-user-name="`${item.fName.toLowerCase()} ${item.lName.toLowerCase()}`">
                        <td v-html="item.fullName"></td>
                        <td>
                          <v-autocomplete v-model="item.selectedRoleName" :items="roleNames" label="Select Role"
                            class="select-fixed-width" variant="solo" return-object clearable></v-autocomplete>
                        </td>
                      </tr>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </div>

            <!-- User Roles Section -->
            <div v-if="selectedTab === 'User Roles'">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>User Roles</span>
                  <v-btn color="primary" class="ma-2" @click="
            resetForm(),
            (showAddUserRoleDialog = true),
            (editingUserRole = false)
            ">
                    Add New Role
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="userRoleHeaders" :items="roles" item-key="id" class="elevation-1"
                    :items-per-page="10" :items-per-page-options="[5, 10, 20, 50, -1]"
                    v-model:sort-by="userRolesSortBy">
                    <template v-slot:item.actions="{ item }">
                      <v-btn icon class="table-icons" @click="editUserRole(item)" v-if="item.id !== 1">
                        <v-icon>mdi-pencil</v-icon>
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

    <!-- Add/Edit User Role Dialog -->
    <v-dialog v-model="showAddUserRoleDialog" max-width="600px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
          {{ editingUserRole ? "Edit" : "Add" }} User Role</v-card-title>
        <v-card-text>
          <v-form ref="formUserRole" v-model="validUserRole">
            <v-text-field label="Role Name" variant="outlined" v-model="newUserRole.name"
              :rules="[rules.required, rules.maxNameLength]" maxlength="40" counter></v-text-field>
            <!-- Category Selection -->
            <v-autocomplete label="Department" variant="outlined" :items="assetCategories"
              v-model="newUserRole.categoryId" item-text="title" item-value="categoryId" :rules="[rules.required]"
              clearable></v-autocomplete>

            <v-card-text class="font-weight-bold text-primary text-h6 mr-0 mb-1 pb-1">Position</v-card-text>
            <v-col>
              <v-radio-group v-model="pickRole" inline>
                  <v-radio label="Administrator" value="isAdmin" class="mr-2"></v-radio>
                  <v-radio label="Manager" value="isManager" class="mr-2
                  "></v-radio>
                  <v-radio label="Student Worker" value="isWorker"></v-radio>
              </v-radio-group>
            </v-col>
            <v-card-text class="font-weight-bold text-primary text-h6 mr-0 mb-0 pb-0">Functionalities</v-card-text>
            <v-col>
              <v-checkbox class="font-weight-semi-bold" label="Add" v-model="newUserRole.canAdd"></v-checkbox>
              <v-checkbox label="Edit" v-model="newUserRole.canEdit"></v-checkbox>
              <v-checkbox label="Delete" v-model="newUserRole.canDelete"></v-checkbox>
              <v-checkbox label="Archive" v-model="newUserRole.canArchive"></v-checkbox>
              <v-checkbox label="Activate" v-model="newUserRole.canActivate"></v-checkbox>
            </v-col>
            <v-card-text class="font-weight-bold text-primary text-h6 mr-0 mb-0 pb-0">Menu Options</v-card-text>
            <v-col>
              <v-checkbox label="View Check out/in" v-model="newUserRole.viewCheckOutIn"></v-checkbox>
              <v-row class="ml-0">
                <v-checkbox label="View Services" v-model="newUserRole.viewServices"></v-checkbox>
                <v-icon size="large" color="primary" class="mt-4 ml-2" @click="toggleServices">{{ showServices ?
            'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </v-row>
              <v-col v-if="showServices" class="sub-checkboxes">
                <v-checkbox label="View Maintenance" v-model="newUserRole.viewMaintenance"></v-checkbox>
                <v-checkbox label="View Leases" v-model="newUserRole.viewLeases"></v-checkbox>
                <v-checkbox label="View Warranties" v-model="newUserRole.viewWarranties"></v-checkbox>
              </v-col>
              <v-checkbox label="View Reports" v-model="newUserRole.viewReports"></v-checkbox>
              <v-row class="ml-0">
                <v-checkbox class="mb-0 pb-0" label="View Manage" v-model="newUserRole.viewManage"></v-checkbox>
                <v-icon size="large" color="primary" class="mt-4 ml-2" @click="toggleManage">{{ showManage ?
            'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </v-row>
              <v-col v-if="showManage" class="sub-checkboxes">
                <v-checkbox label="View Assets" v-model="newUserRole.viewAssets"></v-checkbox>
                <v-checkbox label="View Facilities" v-model="newUserRole.viewFacilities"></v-checkbox>
                <v-checkbox label="View People" v-model="newUserRole.viewPeople"></v-checkbox>
                <v-checkbox label="View Users" v-model="newUserRole.viewUsers"></v-checkbox>
              </v-col>
            </v-col>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="closeUserRoleDialog">Cancel</v-btn>
          <v-btn color="saveblue" text :disabled="!validUserRole || !hasUserRoleChanged"
            @click="saveUserRole">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Save All Changes -->
    <v-dialog v-model="showSaveAllConfirmDialog" max-width="500px">
      <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">Confirm Save</v-card-title>
        <v-card-text> Are you sure you want to save all changes? </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="showSaveAllConfirmDialog = false">
            Cancel
          </v-btn>
          <v-btn color="saveblue" text @click="saveAllUserRoleChanges">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.sub-checkboxes {
  position: relative;
  padding-left: 20px;
}

.sub-checkboxes::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #801429;
}
</style>
