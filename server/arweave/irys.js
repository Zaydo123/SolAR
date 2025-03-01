require("dotenv").config(); // Load environment variables
const { Irys } = require("@irys/upload");

const getIrys = async () => {
  const network = "mainnet"; 
  const token = "solana"; 
  const providerUrl = "https://api.mainnet-beta.solana.com";

  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY is missing. Set it in your .env file!");
  }

  const irys = new Irys({
    network, 
    token, 
    key: solana.key, 
    config: { providerUrl },
  });

  return irys;
};
