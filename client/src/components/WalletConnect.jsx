import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Typography, 
  Box,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { ethers } from 'ethers';

const WalletConnect = () => {
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
        }
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask to use this feature');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setError('');
      }
    } catch (err) {
      setError('Error connecting wallet: ' + err.message);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setProvider(null);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card sx={{ maxWidth: 400, margin: '20px auto' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Wallet Connection
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!account ? (
            <Button
              variant="contained"
              color="primary"
              onClick={connectWallet}
              fullWidth
            >
              Connect Wallet
            </Button>
          ) : (
            <>
              <Typography variant="body1">
                Connected: {formatAddress(account)}
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={disconnectWallet}
                fullWidth
              >
                Disconnect
              </Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WalletConnect; 