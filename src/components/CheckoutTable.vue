<script setup>
import { ref, computed, onMounted } from "vue";
import moment from "moment-timezone";
import CheckoutDialog from "../components/CheckoutDialog.vue";

const props = defineProps(["assignee", "checkouts", "key"]);
const emit = defineEmits(["checkout"]);
const checkouts = ref({});
const checkoutDialog = ref(false);
const activeCheckout = ref(null);

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
    checkouts.value = props.checkouts
})

const editCheckout = (item) => {
    activeCheckout.value = item;
    showCheckoutDialog();
}
const showCheckoutDialog = () => {
    checkoutDialog.value = true;
}
const saveCheckout = (responseText) => {
    checkoutDialog.value = false;
    emit('checkout', responseText);
}
const closeCheckoutDialog = () => {
    checkoutDialog.value = false;
    activeCheckout.value = null;
}

</script>
<template>
<div>
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <span>Recent {{ displayAssignee.title }} Checkouts</span>
            <v-btn
                color="saveblue"
                class="ma-2"
                @click="showCheckoutDialog()"
            >
                Checkout
            </v-btn>
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
                <template v-slot:item.edit="{ item }">
                    <v-btn
                        icon
                        class="table-icons"
                        @click="editCheckout(item)"
                    >
                        <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
    <v-dialog v-model="checkoutDialog" persistent max-width="600px">
        <CheckoutDialog 
            :assignee="props.assignee"
            :active-checkout="activeCheckout"
            @cancel-checkout="closeCheckoutDialog"
            @save-checkout="saveCheckout"
        />
    </v-dialog>
</div>

</template>