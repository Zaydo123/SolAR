
// const walletAddress = 's_Li2WJNv45xS0ICR3B5kRQEuDEkXMMgFTsFx094SD4';

// (async () => {
//   try {
//     const amount = '1000000000000';

//     const response = await fetch(`http://localhost:1984/mint/${walletAddress}/${amount}`, {
//       method: 'GET'
//     });

//     if (response.ok) {
//       console.log(`✅ Successfully minted ${amount} winstons to ${walletAddress}`);
//     } else {
//       console.log(`❌ Minting failed:`, await response.text());
//     }
//   } catch (error) {
//     console.error("❌ Error minting tokens:", error);
//   }
// })();
import fetch from 'node-fetch';

const walletAddress = 's_Li2WJNv45xS0ICR3B5kRQEuDEkXMMgFTsFx094SD4';

(async () => {
    try {
        const amount = '1000000000000';

        const response = await fetch(`http://localhost:1984/mint/${walletAddress}/${amount}`, {
            method: 'GET'
        });

        if (response.ok) {
            console.log(`✅ Successfully minted ${amount} winstons to ${walletAddress}`);
        } else {
            console.log(`❌ Minting failed:`, await response.text());
        }
    } catch (error) {
        console.error("❌ Error minting tokens:", error);
    }
})();
