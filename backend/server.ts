const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = '366295381014-0gamnvjo0u7bj7kulot9v8han8calkkm.apps.googleusercontent.com'; // Replace with your actual client ID

const client = new OAuth2Client(CLIENT_ID);

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

app.post('/verify-token', async (req, res) => {
  let token : any = req.body.token;
  // token = 'xxxxx' + token.substring(5);
  // console.log("YOUR TOKEN IS : ", token)


  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error("Invalid token payload");
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      payload,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Token verification failed',
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
