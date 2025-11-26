import React from 'react';
import { Tooltip, IconButton, Typography, Box } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * HelpTooltip - Provides contextual help information
 * @param {string} title - Short title for the tooltip
 * @param {string} content - Detailed help content
 * @param {string} variant - 'help' (question mark) or 'info' (info icon)
 * @param {string} size - Icon size: 'small', 'medium', 'large'
 */
const HelpTooltip = ({ 
  title, 
  content, 
  variant = 'help', 
  size = 'small',
  placement = 'top'
}) => {
  const Icon = variant === 'info' ? InfoOutlinedIcon : HelpOutlineIcon;
  
  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      {title && (
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {title}
        </Typography>
      )}
      <Typography variant="body2">
        {content}
      </Typography>
    </Box>
  );

  return (
    <Tooltip 
      title={tooltipContent} 
      placement={placement}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={3000}
    >
      <IconButton 
        size={size} 
        sx={{ 
          p: 0.5, 
          ml: 0.5,
          color: 'text.secondary',
          '&:hover': { color: 'primary.main' }
        }}
        aria-label={title || 'Help'}
      >
        <Icon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
};

/**
 * Common help texts used across the application
 */
export const HelpTexts = {
  viewLimit: {
    title: 'View Limit',
    content: 'The maximum number of times this file can be downloaded. After reaching this limit, the file will be automatically deleted.'
  },
  expiryTime: {
    title: 'Expiry Time',
    content: 'How long the file will be available for download. After this time, the file will be automatically deleted regardless of remaining views.'
  },
  anonymousMode: {
    title: 'Anonymous Mode',
    content: 'When enabled, your wallet address will not be visible to people who download your file. The file will still be recorded on the blockchain.'
  },
  fileHash: {
    title: 'File Hash (SHA-256)',
    content: 'A unique fingerprint of your file calculated using SHA-256. This hash is stored on the blockchain and can be used to verify the file has not been tampered with.'
  },
  transactionHash: {
    title: 'Transaction Hash',
    content: 'The unique identifier of the blockchain transaction that recorded your file. You can use this to verify the file on the blockchain.'
  },
  accessToken: {
    title: 'Access Token',
    content: 'A secure, randomly generated token that grants access to download the file. Keep this private and only share with intended recipients.'
  },
  shareLink: {
    title: 'Share Link',
    content: 'Copy this link and share it with anyone you want to give access to the file. Anyone with this link can download the file until the view limit or expiry time is reached.'
  },
  walletConnection: {
    title: 'Wallet Connection',
    content: 'Connect your MetaMask or compatible Web3 wallet to upload files. Your wallet address is used to identify you as the file owner.'
  },
  verification: {
    title: 'File Verification',
    content: 'Verify that a downloaded file matches the original by comparing its hash with the one stored on the blockchain. This ensures the file has not been modified.'
  },
  blockNumber: {
    title: 'Block Number',
    content: 'The blockchain block in which your file metadata was recorded. This provides a timestamp and proof of when the file was uploaded.'
  }
};

export default HelpTooltip;
