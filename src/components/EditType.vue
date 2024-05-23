<script setup>
import {ref, onMounted} from 'vue';
import customFieldServices from "../services/customFieldServices"
import assetCategoryServices from '../services/assetCategoryServices';

const props = defineProps(['type', 'rules', 'categories']);

const type = ref({});
const fields = ref([]);
const typeFields = ref([]);
const validType = ref(false);
const selectedCategory = ref({});

const fieldDataTypes = ref(['String', 'List','Decimal', 'Integer'])


onMounted(async() => {
    console.log(props.type)
    try{
        let response;
        if(props.type.title != ''){
            type.value = props.type;
            response = await assetCategoryServices.getById(type.value.categoryId);
            selectedCategory.value = response.data;
        }
        else{
            type.value = {
                title: "",
                desc: "",
                categoryId: ""
            };
        }
        response = await customFieldServices.getAll();
        fields.value = response.data;
        console.log(fields.value)
    }
    catch(err) {console.error(err);}
});

const addField = () => {
    typeFields.value.push({
        name: '',
        identifier: false,
        required: false,
        type: 'String'
    })
};

const removeField = (index) => {
    typeFields.value.splice(index, 1)
}

</script>

<template>
<v-card class="pa-4 rounded-xl">
    <v-card-title class="justify-space-between">
        <span class="headline">{{ props.type.title != '' ? "Edit" : "Add" }} Type</span>
    </v-card-title>
    <v-card-text>
        <v-form ref="formType" v-model="validType">
        <v-container>
            <v-row>
            <v-col cols="12">
                <v-text-field
                    variant="outlined"
                    label="Name"
                    v-model="type.title"
                    :rules="[props.rules.required, props.rules.maxNameLength]"
                    maxlength="50"
                    counter
                    prepend-icon="mdi-rename"
                ></v-text-field>
            </v-col>
            <v-col cols="12">
                <!-- Category Selection -->
                <v-autocomplete
                    label="Category"
                    variant="outlined"
                    :items="props.categories"
                    v-model="selectedCategory.categoryName"
                    item-text="title"
                    item-value="key"
                    :rules="[props.rules.required]"
                    clearable
                    return-object
                    prepend-icon="mdi-folder-multiple-outline"
                ></v-autocomplete>
            </v-col>
            <v-col cols="12">
                <v-textarea
                    label="Description"
                    variant="outlined"
                    v-model="type.desc"
                    :rules="[props.rules.required, props.rules.maxDescLength]"
                    maxlength="255"
                    counter
                    prepend-icon="mdi-note"
                ></v-textarea>
            </v-col>
            </v-row>
            <v-row
                v-for="(field, index) in typeFields"
                :key="index"
            >
                <v-col cols="6">
                    <v-autocomplete
                        label="Field"
                        variant="outlined"
                        v-model="field.name"
                        :items="fields"
                        :rules="[props.rules.required]"
                        item-title="name"
                        item-value="key"
                        clearable
                        return-object
                        prepend-icon="fill space"
                    ></v-autocomplete>
                </v-col>
                <v-col cols="6">
                    <v-radio-group
                    class="ma-2" 
                        inline 
                        v-model="field.type"
                    >
                        <v-radio
                            v-for="dataType in fieldDataTypes"
                            :label="dataType"
                            :value="dataType"
                            color="primary"
                        ></v-radio>
                    </v-radio-group>
                </v-col>
                <v-row class="ma-n10">
                    <v-col cols="3">
                    <v-checkbox
                        prepend-icon="fill space"
                        class="ml-7"
                        label="Required"
                        v-model="field.required"
                        color="primary"
                    ></v-checkbox>
                </v-col>
                <v-col cols="7">
                    <v-checkbox
                        label="Identifier"
                        v-model="field.identifier"
                        color="primary"
                    ></v-checkbox>
                </v-col>
                    <v-col cols="2">
                        <v-btn icon @click="removeField(index)">
                        <v-icon color="primary">mdi-delete</v-icon>
                        </v-btn>
                    </v-col>
                </v-row>
            </v-row>
            <!-- Button to add a new field with a tooltip -->
            <v-row>
            <v-col cols="12">
                <v-tooltip bottom>
                <template v-slot:activator="{ attrs }">
                    <v-btn
                        color="primary"
                        @click="addField"
                        icon
                        v-bind="attrs"
                    >
                        <v-icon left>mdi-plus</v-icon>
                    </v-btn>
                    Add Field
                </template>
                <span>Add a new field to the asset type</span>
                </v-tooltip>
            </v-col>
            </v-row>
        </v-container>
        </v-form>
    </v-card-text>
    <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="cancelgrey" text @click="$emit('closeModal')">Cancel</v-btn>
        <v-btn color="saveblue" @click="saveType" :disabled="!validType">Save</v-btn>
    </v-card-actions>
    <!-- :disabled="!validType || !hasTypeChanged" -->
    </v-card>
</template>