<script setup>
    import { ref, onMounted, computed, onBeforeMount } from "vue";
    import AssignmentServices from "../services/assignment.services.js";
    import SerializedAssetServices from "../services/serializedAssetServices.js";
    import UserRoleServices from "../services/userRoleServices.js";
    import store from "../store/store.js";
    import { format } from "date-fns";
    import { zonedTimeToUtc } from "date-fns-tz";
    import AddPerson from "./AddPerson.vue";

    const props = defineProps(["assignee", "activeCheckout", "assignees", "assets"]);
    const emit = defineEmits(["cancelCheckout", "saveCheckout"]);
    const userRole = ref({});
    const availableAssets = ref([]);
    const selectedAsset = ref(null);
    const assignees = ref([]);
    const selectedAssignee = ref(null);
    const indefiniteCheckout = ref(true);
    const expectedCheckinDate = ref(null);
    const checkoutNotes = ref(null);
    const checkoutFormValid = ref(false);
    const loginUser = computed(() => store.getters.getLoginUserInfo);
    const currentUser = `${loginUser.value.fName} ${loginUser.value.lName}`;
    const showAddNewPersonDialog = ref(false);
    const snackbar = ref(false);
    const snackbarText = ref(null);

    const userRoleId = computed(() => {
        return store.getters.getUserRole;
    });
    const selectLabel = computed(() => {
        let label;
        if(props.assignee === "People") label = "Person";
        else if(props.assignee === "Buildings") label = "Building";
        else if(props.assignee === "Rooms") label = "Room";
        return `Select ${label}`;
    });

    const displayTitle = computed(() => {
        let title;
        if(props.assignee === "People") title = "fullNameWithId";
        else if(props.assignee === "Buildings") title = "name";
        else if(props.assignee === "Rooms") title = "roomName";
        return title;
    })

    const hasCheckoutChanged = computed(() => {
        let checkout = props.activeCheckout;
        return (
            expectedCheckinDate.value !== checkout.expectedCheckinDate ||
            checkoutNotes.value !== checkout.checkoutNote
        )
    })

    const isFormValid = computed(() => {
        return props.activeCheckout ? hasCheckoutChanged.value : checkoutFormValid.value;
    })

    const rules = {
        required: (value) => !!value || "Required.",
        maxNotesLength: (value) => value === null || value.length <= 255,
        expectedCheckinDate: (value) => {
            return new Date(value) >= new Date() || "Date must be today or in the future."
        },
    };

    const getUserRole = async() => {
        let response = await UserRoleServices.get(userRoleId.value);
        userRole.value = response.data;
    }

    const retrieveAssets = async() => {
        availableAssets.value = props.assets;
    }

    const retrieveAssignees = async() => {
        assignees.value = props.assignees;
    }

    const getSelectedAssignee = () => {
        let assignee;
        let checkout = props.activeCheckout;
        if(props.assignee === "People") assignee = checkout.person;
        else if(props.assignee === "Buildings") assignee = checkout.building;
        else if(props.assignee === "Rooms") assignee = checkout.room;
        return assignee;
    }

    onBeforeMount(async() => {
        if(props.activeCheckout){
            expectedCheckinDate.value = props.activeCheckout.expectedCheckinDate;
            if(expectedCheckinDate.value){
                indefiniteCheckout.value = false;
            }
            checkoutNotes.value = props.activeCheckout.checkoutNote;
            selectedAsset.value = props.activeCheckout.serializedAsset;
            selectedAssignee.value = getSelectedAssignee();
        }
        else{
            await getUserRole();
            await retrieveAssets();
            await retrieveAssignees();
        }
    })

    const saveCheckout = async() => {
        if(props.activeCheckout){
            await editCheckout();
        }
        else {
            await createCheckout();
        }
    }

    const convertToUtcForStorage = (localDate) => {
        const timeZone = "America/Chicago"; 
        return zonedTimeToUtc(localDate, timeZone);
    }

    const createCheckout = async() => {
        let responseText;
        const checkoutDateUtc = convertToUtcForStorage(new Date());
        const formattedCheckoutDate = format(
            checkoutDateUtc,
            "yyyy-MM-dd'T'HH:mm:ss'Z'"
        );
        let checkinDate = null;
        if (!indefiniteCheckout.value && expectedCheckinDate.value) {
            checkinDate = format(expectedCheckinDate.value, "MMM dd, yyyy");
        }
        let newCheckout = {
            serializedAssetId: selectedAsset.value.serializedAssetId,
            checkoutDate: formattedCheckoutDate,
            checkoutStatus: true, 
            expectedCheckinDate: checkinDate,
            checkoutNote: checkoutNotes.value,
            checkedOutBy: currentUser
        };
        if(props.assignee === "People") {
            newCheckout.personId = selectedAssignee.value.personId;
        }
        else if(props.assignee === "Buildings") newCheckout.buildingId = selectedAssignee.value.buildingId;
        else if(props.assignee === "Rooms") newCheckout.roomId = selectedAssignee.value.roomId;

        try{
            await AssignmentServices.create(props.assignee, newCheckout);
            await SerializedAssetServices.updateCheckoutStatus(selectedAsset.value.serializedAssetId, true);
            responseText = "Asset checked out successfully.";
        }
        catch(err){
            console.error(err);
            responseText = "Some Error occurred. Please try again later.";
        }
        finally{
            emit('saveCheckout', responseText);
        }
    }

    const editCheckout = async() => {
        let responseText;
        let id = getAssignmentId();
        let checkinDate = null;
        if (!indefiniteCheckout.value && expectedCheckinDate.value) {
            checkinDate = format(expectedCheckinDate.value, "MMM dd, yyyy");
        }
        let newCheckout = {
            expectedCheckinDate: checkinDate,
            checkoutNote: checkoutNotes.value
        };
        try{
            await AssignmentServices.update(props.assignee, id, newCheckout,);
            responseText = "Checkout edited successfully."
        }
        catch(err){
            console.error(err);
            responseText = "Some Error occurred. Please try again later.";
        }
        finally{
            emit('saveCheckout', responseText);
        }
    }
    const getAssignmentId = () => {
        let id;
        let checkout = props.activeCheckout
        if(props.assignee === "People") id = checkout.personAssetId;
        else if(props.assignee === "Buildings") id = checkout.buildingAssetId;
        else if(props.assignee === "Rooms") id = checkout.roomAssetId;
        return id;
    }

    const openAddNewPersonDialog = () => {
        showAddNewPersonDialog.value = true;
    }

    const saveNewPerson = async(person, responseText) => {
        selectedAssignee.value = person;
        await retrieveAssignees();
        snackbarText.value = responseText;
        snackbar.value = true;
        closeAddNewPersonDialog();
    }

    const closeAddNewPersonDialog = () => {
        showAddNewPersonDialog.value = false;
    }

</script>

<template>
<div>
    <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between">
            <span class="headline">Checkout Asset</span>
        </v-card-title>
        <v-form ref="checkoutForm" v-model="checkoutFormValid">
            <v-card-text>
            <v-container id="attach">
                <v-row>
                <v-col cols="12">
                    <v-autocomplete
                        :label="selectLabel"
                        v-model="selectedAssignee"
                        :items="assignees"
                        variant="outlined"
                        :item-title="displayTitle"
                        item-value="key"
                        :rules="[rules.required]"
                        clearable
                        return-object
                        prepend-icon="mdi-account"
                        :disabled="props.activeCheckout !== null"
                    ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                    <v-autocomplete
                        label="Select Asset"
                        v-model="selectedAsset"
                        :items="availableAssets"
                        item-title="serializedAssetName"
                        variant="outlined"
                        item-value="serializedAssetId"
                        :rules="[rules.required]"
                        clearable
                        return-object
                        prepend-icon="mdi-cellphone-settings"
                        :disabled="props.activeCheckout !== null"
                    ></v-autocomplete>
                </v-col>
                <v-col cols="12">
                    <v-checkbox
                        v-model="indefiniteCheckout"
                        label="Indefinite Checkout"
                    ></v-checkbox>
                </v-col>
                <v-col cols="12" v-if="!indefiniteCheckout">
                    <v-date-input
                        v-model="expectedCheckinDate"
                        clearable
                        label="Expected Check-in Date"
                        variant="outlined"
                        color="blue"
                        :rules="[rules.expectedCheckinDate, rules.required]"
                    ></v-date-input>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    label="Notes"
                    variant="outlined"
                    v-model="checkoutNotes"
                    :rules="[rules.maxNotesLength]"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-textarea>
                </v-col>
                </v-row>
            </v-container>
            </v-card-text>
            <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="green" text @click="openAddNewPersonDialog" v-if="props.assignee === 'People'">
                Add New Person</v-btn
            >
            <v-btn color="cancelgrey" text @click="$emit('cancelCheckout')"
                >Cancel</v-btn
            >
            <v-btn
                color="saveblue"
                class="ma-2"
                text
                @click="saveCheckout"
                :disabled="!isFormValid"
            >   
                Checkout
            </v-btn>
            </v-card-actions>
        </v-form>
    </v-card>
    <v-dialog v-model="showAddNewPersonDialog" persistet max-width="600px">
        <AddPerson 
            @save-person="saveNewPerson"
            @close-dialog="closeAddNewPersonDialog"
        />
    </v-dialog>
    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
</div>
</template>