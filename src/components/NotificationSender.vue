<script>
import axios from "axios";

var baseurl = "";
if (process.env.NODE_ENV === "development") {
  baseurl = "http://localhost:3031/asset-t1/";
} else {
  baseurl = "/asset-t1/";
}

export default {
  methods: {
    async sendEmail(emailDetails, type) {
      try {
        const response = await axios.post(
          `${baseurl}sendEmail/${type}`,
          emailDetails
        );
      } catch (error) {
        console.error("Email could not be sent from frontend:", error);
      }
    },
  },
};
</script>

<template></template>
