import { ethers } from "hardhat";

async function callRequestValues() {
    const [signer] = await ethers.getSigners();

    // Replace with your contract's ABI and address
    const contractABI = [
        "function getKid1() public view returns (string memory)",
        "function getKid2() public view returns (string memory)",
        "function getModulus1() public view returns (bytes memory)",
        "function getModulus2() public view returns (bytes memory)"
    ];
    const contractAddress = "0x668f02cc4270AAbC335Fb897d05D7dBe3AEe3a15";

    // Create a contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
        // Call the requestAllJwks function
        // const tx = await contract.requestAllJwks();
        // console.log("Transaction Hash:", tx.hash);

        // // Wait for the transaction to be mined
        // await tx.wait();
        // console.log("Transaction confirmed");

        // Retrieve kid and modulus values
        const kid1 = await contract.getKid1();
        const kid2 = await contract.getKid2();
        const modulus1 = await contract.getModulus1();
        const modulus2 = await contract.getModulus2();

        console.log("Kid1:", kid1);
        console.log("Kid2:", kid2);
        console.log("Modulus1:", modulus1);
        console.log("Modulus2:", modulus2);
    } catch (error) {
        console.error("Error calling requestAllJwks:", error);
    }
}

callRequestValues();
