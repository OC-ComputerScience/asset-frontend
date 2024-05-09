<script>
import axios from 'axios';

const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? 'https://asset.eaglesoftwareteam.com' // Production URL
  : 'http://localhost:3031'; // Local URL

export default {
  methods: {
    async sendEmail(emailDetails, type) {
      try {
        // console.log('Email details:', emailDetails)
        const response = await axios.post(`${apiBaseUrl}/asset-t1/sendEmail/${type}`, emailDetails);
        console.log('Email sent successfully:', response.data);
      } catch (error) {
        console.error('Email could not be sent from frontend:', error);
      }
    }
  }
};
</script>

<template>
  
</template>
