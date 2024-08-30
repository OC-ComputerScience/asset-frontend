<script setup>
import {ref} from "vue";
import SerializedAssetServices from "../services/serializedAssetServices";

const snackbar = ref(false);
const snackbarText = ref("");

const props = defineProps(['asset']);
const emit = defineEmits(['activateAsset', 'cancelActivate']);

const activateAsset = async() => {
    const serializedAssetId = props.asset.serializedAssetId;
    try{
        const data = { activeStatus: 1 };
        await SerializedAssetServices.update(serializedAssetId, data);
        snackbarText.value = "Asset activated successfully.";
        snackbar.value = true;
    }
    catch(err){
        snackbarText.value = "Something went wrong; please try again later.";
        snackbar.value = true;
    }
    finally{
        emit('activateAsset');
    }
}

</script>

<template>
<div>
    <v-card class="pa-4 rounded-xl">
        <v-card-title class="justify-space-between"
          >Ok to Activate</v-card-title
        >
        <v-card-text>Are you sure you want to activate this item? </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="cancelgrey" text @click="$emit('cancelActivate')"
            >Cancel</v-btn
          >
          <v-btn color="saveblue" text @click="activateAsset">Activate</v-btn>
        </v-card-actions>
      </v-card>
      <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
</div>
</template>