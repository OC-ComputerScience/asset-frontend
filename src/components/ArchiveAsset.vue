<script setup>
import { ref, onMounted } from "vue";
import { format } from "date-fns";
import { vMaska } from "maska";
import SerializedAssetServices from "../services/serializedAssetServices";

const props = defineProps(["asset"]);
const snackbar = ref(false);
const snackbarText = ref("");
const serializedAsset = ref({});
const rawDisposalDate = ref(null);
const rawDisposalPrice = ref("");
const disposalMethod = ref(null);
const notes = ref(null);
const validDisposal = ref(false);
const rules = { required: (value) => !!value || "Required." }
const options = {
  preProcess: (val) => val.replace(/[$,]/g, ""),
  postProcess: (val) => {
    if (!val) return "";

    const sub = 3 - (val.includes(".") ? val.length - val.indexOf(".") : 0);

    return Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    })
      .format(val)
      .slice(0, sub ? -sub : undefined);
  },
};

const emit = defineEmits(["archiveAsset", "cancelArchive"]);

onMounted(() => {
    serializedAsset.value = props.asset;
   
});

const archiveAsset = async() => {
    let disposalDate = format(
        new Date(rawDisposalDate.value),
        "MM dd, yyyy"
    );
    let disposalPrice = null;
    if(rawDisposalPrice.value !== ""){
        disposalPrice = rawDisposalPrice.value.replace(
            /[^0-9.-]+/g,
            ""
        );
    }
    let data = {
        activeStatus: 0,
        disposalDate: disposalDate,
        disposalMethod: disposalMethod.value,
        disposalPrice: disposalPrice,
        disposalNotes: notes.value,
    }
    let assetId = props.asset.serializedAssetId;
    try{
        await SerializedAssetServices.update(assetId, data);
        snackbarText.value = "Asset archived successfully.";
        snackbar.value = true;
    }
    catch(err){
        console.error(err)
        snackbarText.value = "Something went wrong. Please try again later."
        snackbar.value = true;
    }
    finally{
        emit("archiveAsset");
    }
};

const cancelArchive = () => {
    emit("cancelArchive");
}

</script>

<template>
<div>
    <v-card class="pa-4 rounded-xl">
        <v-card-title>Confirm Archive</v-card-title>
        <v-card-text>
            <v-form 
                ref="formAssetDisposal"
                v-model="validDisposal"
            >
            <v-row>
                <v-col cols="12">
                    <v-date-input
                    prepend-icon="mdi-calendar"
                    v-model="rawDisposalDate"
                    clearable
                    label="Disposal Date"
                    variant="outlined"
                    color="blue"
                    :rules="[rules.required]"
                ></v-date-input>
                </v-col>
                <v-col cols="12">
                    <v-select
                    v-model="disposalMethod"
                    :items="[
                      'Sold',
                      'Scrapped',
                      'Donated',
                      'Recycled',
                      'Other',
                    ]"
                    label="Disposal Method"
                    variant="outlined"
                    dense
                    prepend-icon="mdi-recycle"
                    :rules="[rules.required]"
                  ></v-select>
                </v-col>
                <v-col cols="12" v-if="disposalMethod === 'Sold'">
                    <v-text-field
                    label="Sale Price"
                    hint="Enter the price at which the asset was disposed of, if applicable."
                    variant="outlined"
                    v-model="rawDisposalPrice"
                    maxlength="12"
                    v-maska:[options]
                    data-maska="0.99"
                    data-maska-tokens="0:\d:multiple|9:\d:optional"
                    inputmode="numeric"
                    type="text"
                    prepend-icon="mdi-cash-multiple"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    label="Disposal Notes"
                    variant="outlined"
                    v-model="notes"
                    maxlength="255"
                    :counter="255"
                    prepend-icon="mdi-note"
                  ></v-textarea>
                </v-col>
            </v-row>
            </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="cancelgrey"
            text
            @click="cancelArchive"
          >
            Cancel
          </v-btn>
          <v-btn
            color="saveblue"
            text
            @click="archiveAsset()"
            :disabled="!validDisposal"
            >Archive</v-btn
          >
        </v-card-actions>
    </v-card>
    <v-snackbar v-model="snackbar" :timeout="3000" class="custom-snackbar">
      {{ snackbarText }}
    </v-snackbar>
</div>
</template>