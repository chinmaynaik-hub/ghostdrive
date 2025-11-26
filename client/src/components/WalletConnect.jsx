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
  Tooltip,
  Menu,
  MenuItem,
  IconButton,
  Divider
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useWallet } from '../context/WalletContext';
import HelpTooltip, { HelpTexts } from './HelpTooltip';

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

// Compact version for navigation bar
const WalletConnectCompact = () => {
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

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getNetworkName = (id) => {
    return NETWORK_NAMES[id] || `Unknown (${id})`;
  };

  const handleConnect = async () => {
    await connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    handleClose();
  };

  const handleSwitchToLocal = async () => {
    await switchNetwork('0x539');
    handleClose();
  };

  if (!isConnected) {
    return (
      <Button
        variant="outlined"
        color="inherit"
        onClick={handleConnect}
        disabled={!isMetaMaskInstalled || isConnecting}
        startIcon={isConnecting ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceWalletIcon />}
        size="small"
        sx={{ 
          borderColor: 'rgba(255,255,255,0.5)',
          '&:hover': {
            borderColor: 'white',
            backgroundColor: 'rgba(255,255,255,0.1)'
          }
        }}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <>
      <Chip
        icon={<AccountBalanceWalletIcon sx={{ color: 'white !important' }} />}
        label={formatAddress(walletAddress)}
        onClick={handleClick}
        onDelete={handleClick}
        deleteIcon={<ExpandMoreIcon sx={{ color: 'white !important' }} />}
        sx={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: 'white',
          fontFamily: 'monospace',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.3)',
          },
          '& .MuiChip-icon': {
            color: 'white'
          }
        }}
      />
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Connected Address
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {walletAddress}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Network
            </Typography>
            <Typography variant="body2">
              {getNetworkName(networkId)}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSwitchToLocal}>
          <SwapHorizIcon sx={{ mr: 1 }} fontSize="small" />
          Switch to Local Network
        </MenuItem>
        <MenuItem onClick={handleDisconnect} sx={{ color: 'error.main' }}>
          <LinkOffIcon sx={{ mr: 1 }} fontSize="small" />
          Disconnect
        </MenuItem>
      </Menu>
    </>
  );
};

// Full card version (for standalone use)
const WalletConnectCard = () => {
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
          <HelpTooltip {...HelpTexts.walletConnection} variant="info" />
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

// Default export is the compact version for navigation
const WalletConnect = WalletConnectCompact;

// Named exports for specific use cases
export { WalletConnectCard, WalletConnectCompact };
export default WalletConnect;
