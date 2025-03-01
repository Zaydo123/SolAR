
const transactionId = "WdzHKRz4v-3JeuhfH4vfrhLZrXfpf-ozvUvzJezq5cE"; // Replace with your transaction ID
const url = `http://localhost:1984/tx/${transactionId}/data`;

(async () => {
  try {
    const response = await fetch(url);
    const base64Data = await response.text();

    // Decode Base64
    const buffer = Buffer.from(base64Data, "base64");
    const decodedText = buffer.toString("utf-8");

    console.log("✅ Retrieved Data:", decodedText);
  } catch (error) {
    console.error("❌ Error fetching data:", error);
  }
})();
