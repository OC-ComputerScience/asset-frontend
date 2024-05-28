<script setup>
import {ref, onMounted} from 'vue';
import customFieldServices from "../services/customFieldServices"
import customFieldTypeServices from "../services/customFieldTypeServices"
import assetTypeServices from '../services/assetTypeServices';
import assetProfileServices from '../services/assetProfileServices';
import assetCategoryServices from '../services/assetCategoryServices';

const props = defineProps(['type', 'rules', 'categories']);

const type = ref({});
const fields = ref([]);
const typeFields = ref([]);
const validType = ref(false);
const selectedCategory = ref({});
const editMode = ref(false);
const hasBeenEdited = ref(false);
const fieldDataTypes = ref(['String', 'List','Decimal', 'Integer'])
const emit = defineEmits(['saveType']);


onMounted(async() => {
    try{
        let response;
        if(props.type.title != ''){
            editMode.value = true;
            type.value = props.type;
            response = await assetCategoryServices.getById(type.value.categoryId);
            selectedCategory.value = response.data;
            await retrieveFields();
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
    }
    catch(err) {console.error(err);}
});

const retrieveFields = async() => {
    try{
       let response = await customFieldTypeServices.getAllForType(type.value.typeId);
        let customFields = response.data;
        for (let field of customFields){
            typeFields.value.push({
                id: field.id,
                customField: {
                    id: field.customField.id,
                    name: field.customField.name,
                    type: field.customField.type,                
                },
                identifier: field.identifier,
                required: field.required,
            });
        } 
    }
    catch(err){
        console.error(err);
    }
};

const addField = () => {
    typeFields.value.push({
        id: null,
        identifier: false,
        required: false,
        customField: {
            id: null,
            name: null,
            type: 'String',
        },
    });
};

const removeField = async(index, field) => {
    typeFields.value.splice(index, 1);
    if(field.id){
        await customFieldTypeServices.delete(field.id);
    }
};

const updateFieldValue = (field) => {
    if(!field.customField.id){
        field.customField = {
            id: null,
            name: field.customField,
            type: 'String'
        }
    }
};

const saveType = async() => {
    let data = {
        typeName: type.value.title,
        desc: type.value.desc,
        categoryId: selectedCategory.value.categoryId
    };
    let typeId;
    try{
        let response;
        if(editMode.value){
            // Update type
            if(hasBeenEdited.value == true) {
                response = await assetTypeServices.update(props.type.typeId, data);
            }   
            typeId = props.type.typeId;
        }
        else{
            // Create new type
            response = await assetTypeServices.create(data);
            typeId = response.data.typeId;
        }
    }
    catch(err){
        console.error(err)
    }
    await saveFields(typeId);
    emit('saveType');
};

const saveFields = async(typeId) => {
    let response;
    try{
        for(let field of typeFields.value){
            let customFieldType = {
                required: field.required,
                identifier: field.identifier,
                typeId: typeId,
                customFieldId: field.customField.id,
            };
            if(field.customField.id == null){
                let customField = {
                    name: field.customField.name,
                    type: field.customField.type,
                };
                response = await customFieldServices.create(customField);
                customFieldType.customFieldId = response.data.id;
            }
            if(field.id){
                response = await customFieldTypeServices.update(field.id, customFieldType);
            }
            else{
                response = await customFieldTypeServices.create(customFieldType);
            }
        }
    }
    catch(err){
        console.error(err)
    }
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
                    @update:modelValue="() => {hasBeenEdited = true}"
                ></v-text-field>
            </v-col>
            <v-col cols="12">
                <!-- Category Selection -->
                <v-autocomplete
                    label="Category"
                    variant="outlined"
                    :items="props.categories"
                    v-model="selectedCategory"
                    item-title="categoryName"
                    item-value="key"
                    :rules="[props.rules.required]"
                    clearable
                    return-object
                    prepend-icon="mdi-folder-multiple-outline"
                    @update:modelValue="() => {hasBeenEdited = true}"
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
                    @update:modelValue="() => {hasBeenEdited = true}"
                ></v-textarea>
            </v-col>
            </v-row>
            <v-row
                v-for="(field, index) in typeFields"
                :key="index"
            >
                <v-col cols="6">
                    <v-combobox
                        label="Field"
                        variant="outlined"
                        v-model="field.customField"
                        :disabled="field.id != null"
                        :items="fields"
                        :rules="[props.rules.required]"
                        item-title="name"
                        item-value="key"
                        clearable
                        return-object
                        prepend-icon="fill space"
                        @update:modelValue="updateFieldValue(field)"
                    ></v-combobox>
                </v-col>
                <v-col cols="6">
                    <v-radio-group
                    class="ma-2" 
                        inline 
                        v-model="field.customField.type"
                        :disabled="field.customField.id != null"
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
                        <v-btn icon @click="removeField(index, field)" >
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
    </v-card>
</template>