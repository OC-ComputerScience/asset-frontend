<script setup>
import { ref, onMounted, computed, watch } from "vue";
import ArchiveAsset from "../components/ArchiveAsset.vue";
import ActivateAsset from "../components/ActivateAsset.vue";
import SerializedAssetServices from "../services/serializedAssetServices";
import router from "../router";

const props = defineProps(["profiles", "types", "userCategory"]);
const emit = defineEmits(["viewSerializedAsset", "openArchiveDialog"]);

const filteredProfiles = computed(() => {
  return selectedTypeId.value
    ? props.profiles.filter(
        (profile) => profile.typeId === selectedTypeId.value
      )
    : props.profiles;
});
const categoryId = computed(() => {
  return props.userCategory === 4 ? null : props.userCategory;
});

const selectedProfileId = ref(null);
const selectedTypeId = ref(null);
const searchKey = ref(null);
const displayedAssets = ref([]);
const activeAsset = ref({});
const showArchived = ref(false);
const showArchiveDialog = ref(false);
const showActivateDialog = ref(false);
const snackbar = ref(false);
const searching = ref(false);
const snackbarText = ref("");
const filterPanel = ref("");

const headers = ref([
  { title: "Asset", key: "serializedAssetName" },
  { title: "Status", key: "checkoutStatus" },
  { title: "View Asset Details", key: "view", sortable: false },
  { title: "Edit", key: "edit", sortable: false },
  { title: "Archive/Activate", key: "archive", sortable: false },
]);
const assetsSortBy = ref([{ key: "serializedAssetName", order: "asc" }]);

const clearProfile = () => {
  selectedProfileId.value = null;
  localStorage.removeItem("selectedProfileId");
};

const clearType = () => {
  selectedTypeId.value = null;
  localStorage.removeItem("selectedTypeId");
};
const clearArchived = () => {
  showArchived.value = false;
  localStorage.removeItem("showArchived");
};
watch(selectedProfileId, (newValue) => {
  localStorage.setItem("selectedProfileId", newValue);
});
watch(selectedTypeId, (newValue) => {
  localStorage.setItem("selectedTypeId", newValue);
});

watch(selectedTypeId, (newValue) => {
  localStorage.setItem("selectedTypeId", newValue);
});
watch(searchKey, (newValue) => {
  localStorage.setItem("searchKey", newValue);
});
watch(showArchived, (newValue) => {
  localStorage.setItem("showArchived", newValue);
});

const clearFilters = () => {
  clearProfile();
  clearType();
  clearArchived();
};

const loadFilters = () => {
  filterPanel.value = [];
  const profileIdValue = localStorage.getItem("selectedProfileId");
  const typeIdValue = localStorage.getItem("selectedTypeId");
  const searchKeyValue = localStorage.getItem("searchKey");
  const showArchivedValue = localStorage.getItem("showArchived");
  if (profileIdValue === "null") {
    selectedProfileId.value = null;
  } else {
    selectedProfileId.value = Number(profileIdValue);
    filterPanel.value = ["filters"];
  }
  if (typeIdValue === "null") {
    selectedTypeId.value = null;
  } else {
    selectedTypeId.value = Number(typeIdValue);
    filterPanel.value = ["filters"];
  }

  if (searchKeyValue === "null") {
    searchKey.value = null;
  } else {
    searchKey.value = searchKeyValue;
    filterPanel.value = ["filters"];
  }
  if (showArchivedValue === "null" || showArchivedValue != "true") {
    showArchived.value = false;
  } else {
    showArchived.value = showArchivedValue === "true";
    filterPanel.value = ["filters"];
  }
};

const searchAssets = async () => {
  try {
    searching.value = true;
    const response = await SerializedAssetServices.getBySearchFilters(
      searchKey.value,
      selectedProfileId.value,
      selectedTypeId.value,
      showArchived.value,
      categoryId.value
    );
    displayedAssets.value = response.data;
  } catch (err) {
    if (err.response.status === 404) {
      snackbarText.value = "No Assets found matching those filters";
      snackbar.value = true;
    }
  } finally {
    searching.value = false;
  }
};

const translateStatus = (status) => {
  return status ? "Checked Out" : "Available";
};

const viewSerializedAsset = (serializedAssetId) => {
  const sourcePage = "assetManage";
  router.push({
    name: "serializedAssetView",
    params: { serializedAssetId: serializedAssetId },
    query: { sourcePage: sourcePage },
  });
};

const editAsset = async (item) => {
  emit("editSerializedAsset", item.serializedAssetId);
};

const openConfirmArchive = (asset) => {
  activeAsset.value = asset;
  showArchiveDialog.value = true;
};

const archiveAsset = async () => {
  showArchiveDialog.value = false;
  activeAsset.value = {};
  displayedAssets.value = [];
  await searchAssets();
};

const cancelArchive = () => {
  showArchiveDialog.value = false;
  activeAsset.value = {};
};

const openConfirmActivate = (asset) => {
  activeAsset.value = asset;
  showActivateDialog.value = true;
};

const activateAsset = async () => {
  showActivateDialog.value = false;
  activeAsset.value = {};
  displayedAssets.value = [];
  await searchAssets();
};

const cancelActivate = () => {
  showActivateDialog.value = false;
  activeAsset.value = false;
};

onMounted(() => {
  loadFilters();
});
</script>
<template>
  <div>
    <v-row class="ma-1 mb-4">
      <v-expansion-panels v-model="filterPanel">
        <v-expansion-panel title="Filters" value="filters">
          <v-expansion-panel-text>
            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedTypeId"
                  :items="props.types"
                  variant="outlined"
                  item-text="title"
                  item-value="typeId"
                  label="Filter by Type"
                  :return-object="false"
                  clearable
                  @update:modelValue="clearProfile"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedProfileId"
                  :items="filteredProfiles"
                  variant="outlined"
                  item-text="title"
                  item-value="profileId"
                  :return-object="false"
                  label="Filter by Profile Select Type First"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-checkbox
                  label="Show Archived"
                  v-model="showArchived"
                  color="primary"
                ></v-checkbox>
              </v-col>
              <v-col cols="12" md="2">
                <v-btn color="primary" class="mt-2" @click="clearFilters">
                  Clear Filters
                </v-btn>
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-row>
    <v-row class="d-flex">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchKey"
          variant="outlined"
          label="Search by Serial Number or Barcode"
          clearable
          @keyup.enter="searchAssets"
        />
      </v-col>
      <v-col cols="12" md="6" align="right">
        <v-btn color="primary" class="mt-2" @click="searchAssets">
          Search
        </v-btn>
      </v-col>
    </v-row>
    <v-row v-if="searching" align="center" justify="center">
      <v-progress-circular color="blue" indeterminate :size="50" />
    </v-row>

    <v-card v-if="displayedAssets.length > 0">
      <v-data-table
        :headers="headers"
        :items="displayedAssets"
        item-key="serializedAssetId"
        class="elevation-1"
        :items-per-page="5"
        :items-per-page-options="[5, 10, 20, 50]"
        v-model:sort-by="assetsSortBy"
      >
        <template v-slot:item.checkoutStatus="{ item }">
          <td>{{ translateStatus(item.checkoutStatus) }}</td>
        </template>
        <template v-slot:item.view="{ item }">
          <div
            class="d-flex align-center justify-start"
            style="padding-left: 10%"
          >
            <v-btn
              icon
              class="table-icons"
              @click="viewSerializedAsset(item.serializedAssetId)"
            >
              <v-icon>mdi-eye</v-icon>
            </v-btn>
          </div>
        </template>

        <template v-slot:item.edit="{ item }">
          <v-btn icon class="table-icons" @click="editAsset(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
        <template v-slot:item.archive="{ item }">
          <v-btn
            v-if="item.activeStatus"
            icon
            class="table-icons"
            @click="openConfirmArchive(item)"
          >
            <v-icon>mdi-arrow-down-box</v-icon>
          </v-btn>
          <v-btn
            v-if="!item.activeStatus"
            icon
            class="table-icons"
            @click="openConfirmActivate(item)"
          >
            <v-icon>mdi-arrow-up-bold-box-outline</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="showArchiveDialog" max-width="600px">
      <ArchiveAsset
        :asset="activeAsset"
        @archive-asset="archiveAsset"
        @cancel-archive="cancelArchive"
      />
    </v-dialog>
    <v-dialog v-model="showActivateDialog" max-width="600px">
      <ActivateAsset
        :asset="activeAsset"
        @activate-asset="activateAsset"
        @cancel-activate="cancelActivate"
      />
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
