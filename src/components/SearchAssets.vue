<script setup>
import { ref, onMounted, computed } from "vue";

const props = defineProps(["profiles", "types"]);

const filteredProfiles = computed(() => {
    return selectedTypeId.value ? props.profiles.filter((profile) => 
        profile.typeId === selectedTypeId.value
    ) : props.profiles
});

const selectedProfileId = ref(null);
const selectedTypeId = ref(null);
const searchKey = ref(null);

const displayedAssets = ref([]);

const clearProfile = () => {
    selectedProfileId.value = null;
}
const clearType =() => {
    selectedTypeId.value = null;
}
const clearFilters = () => {
    clearProfile();
    clearType();
}

const searchAssets = async() => {

}

</script>
<template>
<v-row class="ma-1 mb-4">
    <v-expansion-panels>
        <v-expansion-panel title="Filters">
            <v-expansion-panel-text>
                <v-row >
                    <v-col cols="12" md="5">
                        <v-autocomplete 
                            v-model="selectedProfileId"
                            :items="filteredProfiles"
                            variant="outlined"
                            item-text="title"
                            item-value="key"
                            label="Filter by Profile"
                            clearable
                        />
                    </v-col>
                    <v-col cols="12" md="5">
                        <v-autocomplete 
                            v-model="selectedTypeId"
                            :items="props.types"
                            variant="outlined"
                            item-text="title"
                            item-value="key"
                            label="Filter by Type"
                            clearable
                            @update:modelValue="clearProfile"
                        />
                    </v-col>
                    <v-col cols="12" md="2">
                        <v-btn
                            color="primary"
                            class="mt-2"
                            @click="clearFilters"
                        >
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
        />
    </v-col>
    <v-col cols="12" md="6" align=right>
        <v-btn
            color="primary"
            class="mt-2"
            @click="searchAssets"
        >
            Search
        </v-btn>
    </v-col>
</v-row>
</template>
