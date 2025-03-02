import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the wallet context
const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);

  // Check if wallet is connected on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      // This would normally integrate with Solana wallet adapter
      // For now, we'll just check localStorage
      const savedWalletAddress = localStorage.getItem('walletAddress');
      if (savedWalletAddress) {
        setWalletAddress(savedWalletAddress);
        // Mock wallet object
        setWallet({
          publicKey: savedWalletAddress,
          signMessage: async (message) => {
            // Mock signing
            return new Uint8Array(32);
          }
        });
      }
    };

    checkWalletConnection();
  }, []);

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setConnecting(true);
      
      // In a real implementation, this would use Solana wallet adapter
      // For demo purposes, we'll just use a mock address
      const mockAddress = `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`;
      setWalletAddress(mockAddress);
      localStorage.setItem('walletAddress', mockAddress);
      
      // Mock wallet object
      setWallet({
        publicKey: mockAddress,
        signMessage: async (message) => {
          // Mock signing
          return new Uint8Array(32);
        }
      });
      
      setConnecting(false);
      return true;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setConnecting(false);
      return false;
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setWallet(null);
    setWalletAddress(null);
    localStorage.removeItem('walletAddress');
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        walletAddress,
        connecting,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook for using the wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};