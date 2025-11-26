import React from 'react';
import {
  Box,
  Skeleton,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Paper
} from '@mui/material';

/**
 * Skeleton loader for file table rows
 * Used in FileManager component when loading file list
 */
export const FileTableRowSkeleton = ({ rows = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" width={150} />
            </Box>
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={100} />
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Skeleton variant="circular" width={16} height={16} />
              <Skeleton variant="text" width={50} />
            </Box>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Skeleton variant="circular" width={16} height={16} />
              <Skeleton variant="text" width={60} />
            </Box>
          </TableCell>
          <TableCell>
            <Skeleton variant="rounded" width={60} height={24} />
          </TableCell>
          <TableCell align="right">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="circular" width={28} height={28} />
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};


/**
 * Skeleton loader for file preview card
 * Used in FileDownload component when loading file info
 */
export const FilePreviewSkeleton = () => {
  return (
    <Paper elevation={2} sx={{ p: 2, mt: 1 }}>
      <Skeleton variant="text" width={150} height={32} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={1} sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Filename */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="text" width={80} />
          <Skeleton variant="text" width={200} />
        </Box>
        
        {/* File Size */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="text" width={50} />
          <Skeleton variant="text" width={80} />
        </Box>
        
        {/* Upload Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton variant="text" width={80} />
          <Skeleton variant="text" width={150} />
        </Box>
        
        {/* Views Remaining */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton variant="text" width={120} />
          <Skeleton variant="rounded" width={40} height={24} />
        </Box>
        
        {/* Expiry */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={120} />
        </Box>
        
        {/* File Hash */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton variant="text" width={70} />
          <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
      
      <Skeleton variant="rectangular" height={1} sx={{ my: 2 }} />
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rounded" width={140} height={36} />
        <Skeleton variant="rounded" width={120} height={36} />
      </Box>
    </Paper>
  );
};

/**
 * Skeleton loader for upload card
 * Used when upload component is initializing
 */
export const UploadCardSkeleton = () => {
  return (
    <Card sx={{ maxWidth: 700, margin: '0 auto' }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* File Selection Area */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="rounded" width={150} height={42} />
          </Box>
          
          <Skeleton variant="rectangular" height={1} />
          
          {/* Configuration Options */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rounded" width="100%" height={56} />
            <Skeleton variant="rounded" width="100%" height={56} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="rounded" width={24} height={24} />
              <Box>
                <Skeleton variant="text" width={120} />
                <Skeleton variant="text" width={250} height={16} />
              </Box>
            </Box>
          </Box>
          
          {/* Upload Button */}
          <Skeleton variant="rounded" width="100%" height={42} />
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Blockchain transaction status indicator
 * Shows detailed progress for blockchain operations
 */
export const BlockchainStatusIndicator = ({ status, progress = 0 }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connecting':
        return { label: 'Connecting to blockchain...', color: 'info' };
      case 'signing':
        return { label: 'Waiting for wallet signature...', color: 'warning' };
      case 'pending':
        return { label: 'Transaction pending...', color: 'info' };
      case 'confirming':
        return { label: 'Waiting for confirmation...', color: 'info' };
      case 'confirmed':
        return { label: 'Transaction confirmed!', color: 'success' };
      case 'failed':
        return { label: 'Transaction failed', color: 'error' };
      default:
        return { label: 'Processing...', color: 'info' };
    }
  };

  const { label, color } = getStatusInfo();

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Skeleton 
          variant="circular" 
          width={20} 
          height={20} 
          animation="pulse"
          sx={{ bgcolor: `${color}.light` }}
        />
        <Box sx={{ typography: 'body2', color: `${color}.main` }}>
          {label}
        </Box>
      </Box>
      {progress > 0 && (
        <Skeleton 
          variant="rectangular" 
          width={`${progress}%`} 
          height={4} 
          sx={{ borderRadius: 2, bgcolor: `${color}.main` }}
          animation={false}
        />
      )}
    </Box>
  );
};

export default {
  FileTableRowSkeleton,
  FilePreviewSkeleton,
  UploadCardSkeleton,
  BlockchainStatusIndicator
};
