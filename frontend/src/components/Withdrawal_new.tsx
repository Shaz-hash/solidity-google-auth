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
import { importJWK, jwtVerify, SignJWT } from "jose"; // Updated import
import axios from "axios";

const SocialLockAddress = import.meta.env.VITE_SOCIAL_LOCK_ADDRESS;

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
    console.log("credentials : ");
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

  // async function verifyJwt(token: any) {
  //   const response = await axios.get(
  //     "https://www.googleapis.com/oauth2/v3/certs"
  //   );
  //   const keys = response.data.keys;

  //   const { header, payload, hexSig } = parseJwt(token);
  //   const parsedHeader = JSON.parse(header);
  //   const kid = parsedHeader.kid;
  //   console.log("KID FROM TOKEN IS : ", kid);
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

  //   const { payload: verifiedPayload, protectedHeader } = await jwtVerify(
  //     token,
  //     keyObj
  //   );

  //   return !!verifiedPayload;
  // }

  // async function verifyJwt(token: any) {
  //   const response = await axios.get(
  //     "https://www.googleapis.com/oauth2/v3/certs"
  //   );
  //   const keys = response.data.keys;

  //   const { header, payload, hexSig } = parseJwt(token);
  //   const parsedHeader = JSON.parse(header);
  //   const kid = parsedHeader.kid;
  //   console.log("KID FROM TOKEN IS:", kid);
  //   const key = keys.find((k) => k.kid === kid);
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

  //   try {
  //     const { payload: verifiedPayload, protectedHeader } = await jwtVerify(
  //       token,
  //       keyObj
  //     );
  //     return !!verifiedPayload;
  //   } catch (e) {
  //     console.log("Verification failed:", e);
  //     return false;
  //   }
  // }

  // async function verifyJwt(token) {
  //   const response = await axios.get("https://www.googleapis.com/oauth2/v3/certs");
  //   const keys = response.data.keys;

  //   const { header, payload, signature, modifiedToken } = parseJwt(token);
  //   const parsedHeader = JSON.parse(header);
  //   const kid = parsedHeader.kid;
  //   console.log("KID FROM TOKEN IS:", kid);
  //   const key = keys.find((k) => k.kid === kid);
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

  //   try {
  //     const { payload: verifiedPayload, protectedHeader } = await jwtVerify(modifiedToken, keyObj);
  //     return !!verifiedPayload;
  //   } catch (e) {
  //     console.log("Verification failed:", e);
  //     return false;
  //   }
  // }

  async function verifyJwt(token) {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v3/certs"
    );
    const keys = response.data.keys;

    const { header, payload, signature, modifiedToken } = parseJwt(token);
    const parsedHeader = JSON.parse(header);
    const kid = parsedHeader.kid;
    console.log("KID FROM TOKEN IS:", kid);
    const key = keys.find((k) => k.kid === kid);
    if (!key) {
      throw new Error("Key ID not found in JWKS");
    }

    const keyObj = await importJWK({
      kty: key.kty,
      n: key.n,
      e: key.e,
      alg: key.alg,
      use: key.use,
    });

    try {
      const { payload: verifiedPayload, protectedHeader } = await jwtVerify(
        modifiedToken,
        keyObj
      );
      return !!verifiedPayload;
    } catch (e) {
      console.log("Verification failed:", e);
      return false;
    }
  }

  async function generateGarbageJwt() {
    // Create a garbage JWT for testing
    const fakePayload = {
      sub: "fake-sub",
      email: "fake@example.com",
      nonce: "fake-nonce",
    };
    const fakeKey = {
      kty: "RSA",
      n: "fake-n",
      e: "AQAB",
      alg: "RS256",
      use: "sig",
    };

    const keyObj = await importJWK(fakeKey);
    const token = await new SignJWT(fakePayload)
      .setProtectedHeader({ alg: "RS256", kid: "fake-kid" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(keyObj);

    return token;
  }

  async function testGarbageJwt() {
    const garbageJwt = await generateGarbageJwt();
    const isValid = await verifyJwt(garbageJwt);
    console.log("Garbage JWT is valid:", isValid); // Should print false
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

  // function parseJwt(token: string) {
  //   const parts = token.split(".");
  //   const header = Buffer.from(parts[0], "base64").toString();
  //   const payload = Buffer.from(parts[1], "base64").toString();

  //   // Tweak the signature to ensure it cannot be verified
  //   const signature = Buffer.from(parts[2], "base64").toString("hex");
  //   const tweakedSignature = signature
  //     .split("")
  //     .map((char, index) => {
  //       // Change the first character of the signature to '0' to invalidate it
  //       return index === 0 ? "7" : char;
  //     })
  //     .join("");

  //   const hexSig = "0x" + tweakedSignature;

  //   return {
  //     header,
  //     payload,
  //     hexSig,
  //   };

  // Function to parse and modify JWT
  function parseJwt(token: any) {
    const parts = token.split(".");
    const header = Buffer.from(parts[0], "base64").toString();
    const payload = Buffer.from(parts[1], "base64").toString();

    // Modify the signature to ensure it cannot be verified
    const signature = parts[2]
      .split("")
      .map((char: any, index: any) => {
        // Change the first character of the signature to 'A' to invalidate it
        return index === 0 ? "A" : char;
      })
      .join("");

    // Return the modified token parts
    return {
      header,
      payload,
      signature,
      modifiedToken: `${parts[0]}.${parts[1]}.${signature}`,
    };
  }

  // return {
  //   header: Buffer.from(token.split(".")[0], "base64").toString(),
  //   payload: Buffer.from(token.split(".")[1], "base64").toString(),
  //   hexSig: "0x" + Buffer.from(token.split(".")[2], "base64").toString("hex"),
  // };

  async function withdraw() {
    try {
      if (!socialLock) throw "Error: SocialLock contract not found.";
      const { header, payload, hexSig } = parseJwt(jwt);

      const verificationResponse = await verifyJwt(jwt);
      console.log("hello");
      console.log(verificationResponse);

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
        console.log("Value of header is : ", header);
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
                <Button onClick={testGarbageJwt}>Test Garbage JWT</Button>
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
