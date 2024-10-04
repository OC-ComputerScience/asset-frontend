<script setup>
import { ref, computed, onMounted } from "vue";
import moment from "moment-timezone";
import CheckinDialog from "./CheckinDialog.vue";

const props = defineProps(["assignee", "recentCheckins", "key", "checkouts"]);
const emit = defineEmits(["checkin"]);
const recentCheckins = ref({});
const activeCheckin = ref(null);
const checkinDialog = ref(false);
const checkinEditMode = ref(false);

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
    { title: "Checked-in By", key: "checkedInBy" },
    { title: "Expected Check-in Date", key: "expectedCheckinDate" },
    { title: "Check-in Date", key: "checkinDate" },
    { title: "Edit", key: 'edit' }
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
    recentCheckins.value = props.recentCheckins
})

const editCheckin = (item) => {
    activeCheckin.value = item;
    checkinEditMode.value = true;
    showCheckinDialog();
}
const showCheckinDialog = () => {
    checkinDialog.value = true;
}
const saveCheckin = (responseText) => {
    checkinEditMode.value = false;
    checkinDialog.value = false;
    emit('checkin', responseText);
}
const closeCheckinDialog = () => {
    checkinEditMode.value = false;
    checkinDialog.value = false;
    activeCheckin.value = null;
}

</script>
<template>
<div>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span>Recent {{ displayAssignee.title }} Check-ins</span>
            <v-btn
                color="saveblue"
                class="ma-2"
                @click="showCheckinDialog()"
            >
                Checkin
            </v-btn>
        </v-card-title>
        <v-card-text>
            <v-data-table v-if="recentCheckins.length > 0"
                :headers="headers"
                :items="recentCheckins"
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
                <template v-slot:item.edit="{ item }">
                    <v-btn
                        icon
                        class="table-icons"
                        @click="editCheckin(item)"
                    >
                        <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
    <v-dialog v-model="checkinDialog" persistent max-width="600px" scrollable>
        <CheckinDialog 
            :assignee="props.assignee"
            :active-checkin="activeCheckin"
            :checkouts="props.checkouts"
            :edit-mode="checkinEditMode"
            @cancel-checkin="closeCheckinDialog"
            @save-checkin="saveCheckin"
        />
    </v-dialog>
</div>

</template>