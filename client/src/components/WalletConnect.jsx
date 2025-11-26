import React from 'react';
import { 
  Button, 
  Typography, 
  Box,
  Card,
  CardContent,
  Alert,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useWallet } from '../context/WalletContext';

// Network names mapping
const NETWORK_NAMES = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon Mainnet',
  80001: 'Mumbai Testnet',
  1337: 'Ganache Local',
  31337: 'Hardhat Local',
};

const WalletConnect = () => {
  const {
    walletAddress,
    isConnected,
    networkId,
    error,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    clearError,
    formatAddress,
    isMetaMaskInstalled,
  } = useWallet();

  const getNetworkName = (id) => {
    return NETWORK_NAMES[id] || `Unknown Network (${id})`;
  };

  const getNetworkColor = (id) => {
    if (id === 1) return 'success';
    if (id === 1337 || id === 31337) return 'warning';
    return 'info';
  };


  const handleConnect = async () => {
    await connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  const handleSwitchToLocal = async () => {
    // Switch to Ganache local network (chainId 1337 = 0x539)
    await switchNetwork('0x539');
  };

  return (
    <Card sx={{ maxWidth: 450, margin: '20px auto' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AccountBalanceWalletIcon color="primary" />
          <Typography variant="h6">
            Wallet Connection
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={clearError}
          >
            {error}
          </Alert>
        )}

        {!isMetaMaskInstalled && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            MetaMask is not installed. Please install MetaMask to use blockchain features.
            <Box sx={{ mt: 1 }}>
              <Button 
                size="small" 
                variant="outlined"
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install MetaMask
              </Button>
            </Box>
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!isConnected ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleConnect}
              disabled={!isMetaMaskInstalled || isConnecting}
              startIcon={isConnecting ? <CircularProgress size={20} color="inherit" /> : <AccountBalanceWalletIcon />}
              fullWidth
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <>
              {/* Connected Address */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 1.5,
                bgcolor: 'success.light',
                borderRadius: 1,
                color: 'success.contrastText'
              }}>
                <Typography variant="body2" fontWeight="medium">
                  Connected
                </Typography>
                <Tooltip title={walletAddress} arrow>
                  <Chip 
                    label={formatAddress(walletAddress)}
                    size="small"
                    sx={{ 
                      bgcolor: 'white', 
                      fontFamily: 'monospace',
                      fontWeight: 'bold'
                    }}
                  />
                </Tooltip>
              </Box>

              {/* Network Info */}
              {networkId && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    Network:
                  </Typography>
                  <Chip 
                    label={getNetworkName(networkId)}
                    size="small"
                    color={getNetworkColor(networkId)}
                    variant="outlined"
                  />
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleSwitchToLocal}
                  startIcon={<SwapHorizIcon />}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  Switch to Local
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  startIcon={<LinkOffIcon />}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  Disconnect
                </Button>
              </Box>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WalletConnect;
