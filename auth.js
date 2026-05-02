const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = 'http://20.207.122.201/evaluation-service';

const USER_DETAILS = {
  email: "tr4792@srmist.edu.in",
  name: "Trisha Raj",
  mobileNo: "8235454666",
  githubUsername: "trisharaj11",
  rollNo: "RA2311003030080",
  accessCode: "QkbpxH"
};

async function authenticate() {
  try {
    let clientID = process.env.CLIENT_ID;
    let clientSecret = process.env.CLIENT_SECRET;

    if (!clientID || !clientSecret || clientID.includes('your_client')) {
      console.log('Registering with test server...');
      const regResponse = await axios.post(`${BASE_URL}/register`, USER_DETAILS);
      
      clientID = regResponse.data.clientID;
      clientSecret = regResponse.data.clientSecret;
      
      console.log('Registration Successful!');
      console.log(`ClientID: ${clientID}`);
      console.log(`ClientSecret: ${clientSecret}`);
      console.log('Make sure to save these, you cannot retrieve them again!\n');
    } else {
      console.log('Using existing ClientID and ClientSecret from environment.');
    }

    console.log('Authenticating to get Bearer Token...');
    const authPayload = { ...USER_DETAILS, clientID, clientSecret };
    const authResponse = await axios.post(`${BASE_URL}/auth`, authPayload);
    
    const token = authResponse.data.access_token;
    console.log('Authentication Successful!');
    console.log(`Bearer Token: ${token}`);
    
    const envContent = `EVAL_TOKEN=${token}
CLIENT_ID=${clientID}
CLIENT_SECRET=${clientSecret}
BASE_URL=${BASE_URL}
`;
    fs.writeFileSync('.env', envContent);
    console.log('\nSuccessfully wrote credentials to .env file.');

  } catch (error) {
    console.error('Failed:', error.response ? error.response.data : error.message);
  }
}

authenticate();
