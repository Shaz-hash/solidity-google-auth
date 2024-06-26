import {
  Button,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Switch,
} from "@mui/material";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { ethers } from "ethers";
import { useState } from "react";
import { useAccount, useSigner } from "wagmi";
import { Buffer } from "buffer";
import SocialLock from "../../../artifacts/contracts/SocialLock.sol/SocialLock.json";
import TransactionProgress from "./TransactionProgress";
import erc20abi from "erc-20-abi";
import { KEYUTIL, RSAKey, KJUR } from "jsrsasign";
import { importJWK, jwtVerify, SignJWT } from "jose";
import axios from "axios";
// import { OAuth2Client } from "google-auth-library";
// import * as crypto from "crypto";

const SocialLockAddress = import.meta.env.VITE_SOCIAL_LOCK_ADDRESS;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// const client = new OAuth2Client(CLIENT_ID);

function Withdrawal() {
  const { address, isConnected } = useAccount();
  const [loggedIn, setLoggedIn] = useState("");
  const [jwt, setJwt] = useState("");
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState();
  const [amoutnAvailable, setAmountAvailable] = useState("");
  const [message, setMessage] = useState("");
  const [isToken, setIsToken] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenAmountAvailable, setTokenAmountAvailable] = useState("");
  const [email, setEmail] = useState("");

  if (!address)
    return <div>Could not find address. Please connect your wallet.</div>;

  // The following code base64url encodes the address to be used as the nonce in the JWT
  const base64Address = ethers.utils.base64
    .encode(address)
    .replace("=", "")
    .replace("+", "-")
    .replaceAll("/", "_");
  console.log("Base64 address: " + base64Address);

  // matches this solidity code: bytes32 emailHash = keccak256(abi.encodePacked(email));
  const encodedSender = ethers.utils.hexlify(
    Buffer.from(ethers.utils.toUtf8Bytes(address))
  );
  console.log("Encoded sender: " + encodedSender);

  const { data: signer, isError, isLoading } = useSigner();
  if (!signer) return <div>Signer not found.</div>;

  const socialLock = new ethers.Contract(
    SocialLockAddress,
    SocialLock.abi,
    signer
  );

  async function onLogin(credentialResponse: CredentialResponse) {
    console.log(credentialResponse);
    if (credentialResponse.credential) {
      const { header, payload, hexSig } = parseJwt(
        credentialResponse.credential
      );
      const parsedPayload = JSON.parse(payload);
      setEmail(parsedPayload.email);
      setLoggedIn(parsedPayload.email);
      updateAvailable(parsedPayload.email);
      console.log("nonce from jwt", parsedPayload.nonce);
      setJwt(credentialResponse.credential);
    }
  }

  async function updateTokenAddress(e: React.ChangeEvent<HTMLInputElement>) {
    const tokenAddress = e.target.value;
    setTokenAddress(tokenAddress);
    if (!ethers.utils.isAddress(tokenAddress)) {
      setMessage("Invalid token address");
      return;
    }
    if (!signer) throw "Error: Signer not found.";
    const token = new ethers.Contract(tokenAddress, erc20abi, signer);
    if (!token) {
      setMessage("Invalid token address");
      return;
    }
    const emailHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(email));
    const value = await socialLock.tokenBalances(emailHash, token.address);
    console.log(
      "Token balance for user " +
        email +
        " on contract " +
        SocialLockAddress +
        " is " +
        value
    );
    setTokenAmountAvailable(
      ethers.utils.formatUnits(value, await token.decimals())
    );
  }

  async function updateAvailable(email: string) {
    if (!socialLock) throw "Error: SocialLock contract not found.";
    console.log(
      "Checking user balance for email " +
        email +
        " on contract " +
        SocialLockAddress +
        "..."
    );
    const emailHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(email));
    const value = await socialLock.balances(emailHash);
    setAmountAvailable(ethers.utils.formatEther(value));
  }

  function parseJwt1(token: string) {
    return {
      header: Buffer.from(token.split(".")[0], "base64").toString(),
      payload: Buffer.from(token.split(".")[1], "base64").toString(),
      hexSig: Buffer.from(token.split(".")[2], "base64").toString("hex"),
      signature: Buffer.from(token.split(".")[2], "base64"),
    };
  }

  function parseJwt(token: string) {
    return {
      header: Buffer.from(token.split(".")[0], "base64").toString(),
      payload: Buffer.from(token.split(".")[1], "base64").toString(),
      hexSig: "0x" + Buffer.from(token.split(".")[2], "base64").toString("hex"),
    };
  }

  function verifySignature(
    message: string,
    signature: string,
    modulus: string,
    exponent: string
  ): boolean {
    const rsaKey = KEYUTIL.getKey({ n: modulus, e: exponent });
    const sig = new KJUR.crypto.Signature({ alg: "SHA256withRSA" });
    sig.init(rsaKey);
    sig.updateString(message);

    return sig.verify(signature);
  }

  // async function verifyGoogleIdToken(token: string) {
  //   try {
  //     const ticket = await client.verifyIdToken({
  //       idToken: token,
  //       audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
  //     });

  //     const payload = ticket.getPayload();
  //     if (!payload) {
  //       throw new Error("Invalid token payload");
  //     }

  //     const userId = payload["sub"];
  //     console.log("User ID:", userId);
  //     console.log("Token Payload:", payload);

  //     // You can also check additional claims such as 'hd' (hosted domain)
  //     // const domain = payload['hd'];
  //     return payload;
  //   } catch (error) {
  //     console.error("Error verifying ID token:", error);
  //     throw error;
  //   }
  // }

  // async function verifyJwt(token: string) {
  //   const response = await axios.get(
  //     "https://www.googleapis.com/oauth2/v3/certs"
  //   );
  //   const keys = response.data.keys;

  //   const { header, payload, hexSig, signature } = parseJwt1(token);
  //   const parsedHeader = JSON.parse(header);
  //   const kid = parsedHeader.kid;
  //   console.log("KID FROM TOKEN IS:", kid);
  //   const key = keys.find((k: any) => k.kid === kid);
  //   if (!key) {
  //     throw new Error("Key ID not found in JWKS");
  //   }

  //   const keyObj = await importJWK({
  //     kty: key.kty,
  //     n: key.n,
  //     e: key.e,
  //     alg: key.alg,
  //     use: key.use,
  //   });

  //   // Concatenate header and payload to form the message
  //   const message = `${token.split(".")[0]}.${token.split(".")[1]}`;

  //   // Verify the signature
  //   const isValid = verifySignature(
  //     message,
  //     signature.toString("base64"),
  //     key.n,
  //     key.e
  //   );

  //   return isValid;
  // }

  async function verifyJwt(token: string) {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v3/certs"
    );
    const keys = response.data.keys;

    const { header, payload, hexSig } = parseJwt(token);
    const parsedHeader = JSON.parse(header);
    const kid = parsedHeader.kid;
    console.log("KID FROM TOKEN IS:", kid);

    const key = keys.find((k: any) => k.kid === kid);
    if (!key) {
      throw new Error("Key ID not found in JWKS");
    }

    const modulus = Buffer.from(key.n, "base64").toString("hex");
    const exponent = Buffer.from(key.e, "base64").toString("hex");

    console.log("Modulus:", modulus);
    console.log("Exponent:", exponent);

    // Concatenate header and payload to form the message
    const message = `${token.split(".")[0]}.${token.split(".")[1]}`;
    console.log("Message to be verified:", message);

    // Verify the signature
    const isValid = verifySignature(
      message,
      Buffer.from(hexSig, "hex").toString("base64"),
      modulus,
      exponent
    );

    console.log("Is the signature valid?", isValid);
    return isValid;
  }

  // try {
  //   const { payload: verifiedPayload, protectedHeader } = await jwtVerify(
  //     modifiedToken,
  //     keyObj
  //   );
  //   return !!verifiedPayload;
  // } catch (e) {
  //   console.log("Verification failed:", e);
  //   return false;
  // }
  // }

  async function withdraw() {
    try {
      if (!socialLock) throw "Error: SocialLock contract not found.";
      const { header, payload, hexSig } = parseJwt(jwt);
      verifyJwt(jwt)
        .then((isValid) => console.log("JWT is valid:", isValid))
        .catch((error) => console.error("Error verifying JWT:", error));

      // verifyGoogleIdToken(jwt)
      //   .then((payload) => console.log("GOOGLE JWT is valid:", payload))
      //   .catch((error) =>
      //     console.error("GOOGLE JWT verification failed:", error)
      //   );

      // SENDING THE TOKEN TO BACKEND SERVER INSTEAD :
      // Send JWT token to the server for verification
      const verifyJwtOnServer = async (jwt: string) => {
        const response = await fetch("http://localhost:3000/verify-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: jwt }),
        });
        return response.json();
      };

      const verificationResult = await verifyJwtOnServer(jwt);
      if (verificationResult.success) {
        console.log("GGOGLE JWT is valid:", verificationResult);
      } else {
        console.error(
          "GOOGLE JWT verification failed:",
          verificationResult.message
        );
        throw new Error("GOOGLE JWT verification failed");
      }

      // SENDING BACKEND TOKEN STOP

      if (isToken) {
        if (!signer) throw "Error: Signer not found.";
        const token = new ethers.Contract(tokenAddress, erc20abi, signer);
        if (!token) {
          setMessage("Invalid token address");
          return;
        }
        const amoutBN = ethers.utils.parseUnits(amount, await token.decimals());
        const tx = await socialLock.withdrawToken(
          header,
          payload,
          hexSig,
          token.address,
          amoutBN
        );
        setTx(tx);
      } else {
        const value = ethers.utils.parseEther(amount);
        console.log("YOUR SIGNATURE IS : ", hexSig);
        const tx = await socialLock.withdraw(header, payload, hexSig, value);
        setTx(tx);
      }
    } catch (e: any) {
      console.log(e);
      setMessage(e.message);
    }
  }

  return (
    <div>
      {!loggedIn && (
        <p className="read-the-docs">
          Please login via Google to withdraw your funds.
        </p>
      )}
      <GoogleLogin
        containerProps={{ style: { display: "inline-block" } }}
        nonce={base64Address}
        onSuccess={onLogin}
        onError={() => console.log("Login Failed")}
      />
      {loggedIn && (
        <div>
          <p>
            Logged in as {loggedIn}! Amount available: {amoutnAvailable} ETH
          </p>
          <p>How much do you want to claim?</p>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl sx={{ m: 1, width: "20ch", float: "left" }}>
                <FormControlLabel
                  control={
                    <Switch
                      value={isToken}
                      onChange={(e, c) => setIsToken(c)}
                    />
                  }
                  label="Token Withdrawal?"
                />
              </FormControl>

              {isToken && (
                <div>
                  <FormControl sx={{ m: 1, width: "80ch" }}>
                    <InputLabel htmlFor="outlined-adornment-amount">
                      Token Address
                    </InputLabel>
                    <OutlinedInput
                      sx={{}}
                      id="outlined-adornment-amount"
                      label="Token Address"
                      type="text"
                      value={tokenAddress}
                      onChange={updateTokenAddress}
                    />
                  </FormControl>
                  {tokenAmountAvailable && (
                    <p>Amount available: {tokenAmountAvailable}</p>
                  )}
                </div>
              )}
            </Grid>
          </Grid>

          {!tx && (
            <form>
              <FormControl sx={{ m: 1, width: "25ch" }}>
                <InputLabel htmlFor="outlined-adornment-amount">
                  Amount
                </InputLabel>
                <OutlinedInput
                  id="outlined-adornment-amount"
                  startAdornment={
                    <InputAdornment position="start">
                      {isToken ? "Token" : "ETH"}
                    </InputAdornment>
                  }
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl sx={{ m: 1, width: "25ch" }}>
                <Button onClick={withdraw}>Withdraw!</Button>
              </FormControl>
            </form>
          )}

          {tx && (
            <div>
              <p>
                Transaction submitted. {amount} are being sent to {address}.
              </p>
              <TransactionProgress tx={tx} />
            </div>
          )}
          {message && <p>{message}</p>}
        </div>
      )}
    </div>
  );
}

export default Withdrawal;
