import { expect } from "chai";
import { ethers } from "hardhat";

describe("DeploySocialLock Task", function () {
  it("should deploy SocialLock contract", async function () {
    // Get the deployment parameters
    const aud = "366295381014-0gamnvjo0u7bj7kulot9v8han8calkkm.apps.googleusercontent.com";
    const jwks = "0x9d9749c50FaE5533ffb86ea3a5EffA10559eadB4";

    // Deploy the contract
    const SocialLockFactory = await ethers.getContractFactory("SocialLock");
    const socialLock = await SocialLockFactory.deploy(aud, jwks);

    // Assert that contract deployment was successful
    expect(socialLock.address).to.not.be.null;
  });
});
