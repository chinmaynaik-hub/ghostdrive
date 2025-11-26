import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Create the context
const WalletContext = createContext(null);

// Error codes for wallet operations
const ERROR_CODES = {
  USER_REJECTED: 4001,
  REQUEST_PENDING: -32002,
  CHAIN_NOT_ADDED: 4902,
};

// Default network configuration (Ganache local)
const DEFAULT_CHAIN_ID = '0x539'; // 1337 in hex

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  }, []);

  // Format wallet address for display
  const formatAddress = useCallback((address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }, []);

  // Get current network ID
  const getNetworkId = useCallback(async () => {
    if (!window.ethereum) return null;
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainId, 16);
    } catch (err) {
      console.error('Error getting network ID:', err);
      return null;
    }
  }, []);


  // Connect wallet function
  const connectWallet = useCallback(async () => {
    console.log('=== connectWallet function called ===');
    console.log('typeof window:', typeof window);
    console.log('window.ethereum:', window.ethereum);
    console.log('Boolean(window.ethereum):', Boolean(window.ethereum));
    console.log('isMetaMaskInstalled():', isMetaMaskInstalled());
    setError(null);
    
    console.log('Checking if MetaMask is installed...');
    if (!isMetaMaskInstalled()) {
      console.log('MetaMask NOT installed');
      console.log('All window properties with "ethereum":', Object.keys(window).filter(k => k.toLowerCase().includes('ethereum')));
      setError('MetaMask is not installed. Please install MetaMask to use this feature.');
      return false;
    }
    console.log('MetaMask IS installed');

    setIsConnecting(true);
    console.log('Set isConnecting to true');

    try {
      // Request account access
      console.log('Requesting accounts from MetaMask...');
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      console.log('Accounts received:', accounts);

      if (accounts.length === 0) {
        setError('No accounts found. Please create an account in MetaMask.');
        setIsConnecting(false);
        return false;
      }

      // Create provider and signer
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const walletSigner = await browserProvider.getSigner();
      const network = await getNetworkId();

      setWalletAddress(accounts[0]);
      setProvider(browserProvider);
      setSigner(walletSigner);
      setNetworkId(network);
      setIsConnected(true);
      setIsConnecting(false);

      return true;
    } catch (err) {
      setIsConnecting(false);
      
      if (err.code === ERROR_CODES.USER_REJECTED) {
        setError('Wallet connection rejected. Please approve the connection to continue.');
      } else if (err.code === ERROR_CODES.REQUEST_PENDING) {
        setError('Connection request pending. Please check your MetaMask wallet.');
      } else {
        setError(`Failed to connect wallet: ${err.message}`);
      }
      
      return false;
    }
  }, [isMetaMaskInstalled, getNetworkId]);

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setNetworkId(null);
    setError(null);
  }, []);

  // Switch network function
  const switchNetwork = useCallback(async (chainId = DEFAULT_CHAIN_ID) => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed.');
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });

      const network = await getNetworkId();
      setNetworkId(network);
      
      // Refresh provider and signer after network switch
      if (isConnected) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const walletSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(walletSigner);
      }

      return true;
    } catch (err) {
      if (err.code === ERROR_CODES.CHAIN_NOT_ADDED) {
        setError('Network not found in MetaMask. Please add the network manually.');
      } else if (err.code === ERROR_CODES.USER_REJECTED) {
        setError('Network switch rejected by user.');
      } else {
        setError(`Failed to switch network: ${err.message}`);
      }
      return false;
    }
  }, [isMetaMaskInstalled, getNetworkId, isConnected]);


  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const walletSigner = await browserProvider.getSigner();
          const network = await getNetworkId();

          setWalletAddress(accounts[0]);
          setProvider(browserProvider);
          setSigner(walletSigner);
          setNetworkId(network);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Error checking existing connection:', err);
      }
    };

    checkExistingConnection();
  }, [isMetaMaskInstalled, getNetworkId]);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
      } else if (accounts[0] !== walletAddress) {
        // User switched accounts
        setWalletAddress(accounts[0]);
        
        if (window.ethereum) {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const walletSigner = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(walletSigner);
        }
      }
    };

    const handleChainChanged = async (chainId) => {
      const network = parseInt(chainId, 16);
      setNetworkId(network);
      
      // Refresh provider and signer on chain change
      if (isConnected && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const walletSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(walletSigner);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [isMetaMaskInstalled, walletAddress, isConnected, disconnectWallet]);

  const value = {
    walletAddress,
    isConnected,
    provider,
    signer,
    networkId,
    error,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    clearError,
    formatAddress,
    isMetaMaskInstalled: isMetaMaskInstalled(),
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
