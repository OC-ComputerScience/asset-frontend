<script setup>
import { ref, computed, onMounted } from "vue";
import moment from "moment-timezone";

const props = defineProps(["assignee", "checkouts", "key"])
const checkouts = ref({});

const displayAssignee = computed(() => {
    let display = {
        title: "", key: "name"
    };
    if(props.assignee === "People") {
        display.title = "Person";
    }
    else if (props.assignee === "Rooms") {
        display.title = "Room";
    }
    else if (props.assignee === "Buildings") {
        display.title = "Building";
    }
    return display;
})

const headers = computed(() => [
    { title: displayAssignee.value.title, key: displayAssignee.value.key },
    { title: "Asset", key: "serializedAsset.serializedAssetName" },
    { title: "Checked-out By", key: "checkedOutBy" },
    { title: "Expected Check-in Date", key: "expectedCheckinDate" },
    { title: "Checkout Date", key: "checkoutDate" },
])

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


onMounted(() => {
    checkouts.value = props.checkouts
})

</script>
<template>
<div>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span>Recent {{ displayAssignee.title }} Checkouts</span>
        </v-card-title>
        <v-card-text>
            <v-data-table v-if="checkouts.length > 0"
                :headers="headers"
                :items="checkouts"
                :items-per-page="5"
                :items-per-page-options="[5, 10, 20, 50, -1]"
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

</template>