import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Collapse,
  Divider
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { useWallet } from '../context/WalletContext';
import { FileTableRowSkeleton } from './SkeletonLoaders';

const API_BASE_URL = 'http://localhost:5000';
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format time remaining for display
const formatTimeRemaining = (milliseconds) => {
  if (milliseconds <= 0) return 'Expired';
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};


// Format date for display
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Get status chip color
const getStatusColor = (status, isExpired) => {
  if (isExpired || status === 'expired') return 'error';
  if (status === 'deleted') return 'default';
  return 'success';
};

// Get status label
const getStatusLabel = (status, isExpired) => {
  if (isExpired || status === 'expired') return 'Expired';
  if (status === 'deleted') return 'Deleted';
  return 'Active';
};

const FileManager = () => {
  const { walletAddress, isConnected, signer } = useWallet();
  
  // State
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedFileId, setExpandedFileId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch user files
  const fetchFiles = useCallback(async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/files/${walletAddress}`);
      
      if (response.data.success) {
        setFiles(response.data.files);
        setLastRefresh(new Date());
      } else {
        setError(response.data.message || 'Failed to fetch files');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      if (err.response?.status === 400) {
        setError('Invalid wallet address format');
      } else {
        setError('Failed to fetch files. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchFiles();
      
      // Set up auto-refresh interval
      const intervalId = setInterval(() => {
        fetchFiles();
      }, AUTO_REFRESH_INTERVAL);
      
      return () => clearInterval(intervalId);
    }
  }, [isConnected, walletAddress, fetchFiles]);

  // Copy share link to clipboard
  const copyShareLink = useCallback(async (file) => {
    const shareLink = `http://localhost:5173/download/${file.accessToken}`;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Toggle file details expansion
  const toggleExpand = useCallback((fileId) => {
    setExpandedFileId(prev => prev === fileId ? null : fileId);
  }, []);

  // Open delete confirmation dialog
  const openDeleteDialog = useCallback((file) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  }, []);

  // Close delete dialog
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setFileToDelete(null);
    setDeleteError(null);
  }, []);


  // Delete file with wallet signature
  const handleDeleteFile = useCallback(async () => {
    if (!fileToDelete || !signer) return;
    
    setDeleting(true);
    setDeleteError(null);
    
    try {
      // Create message to sign
      const message = `Delete file: ${fileToDelete.id} at ${new Date().toISOString()}`;
      
      // Sign the message with wallet
      const signature = await signer.signMessage(message);
      
      // Call delete API with signature
      const response = await axios.delete(
        `${API_BASE_URL}/api/file/${fileToDelete.id}`,
        {
          headers: {
            'x-wallet-address': walletAddress,
            'x-signature': signature,
            'x-message': message
          }
        }
      );
      
      if (response.data.success) {
        // Refresh file list after deletion
        await fetchFiles();
        closeDeleteDialog();
      } else {
        setDeleteError(response.data.message || 'Failed to delete file');
      }
    } catch (err) {
      console.error('Delete error:', err);
      
      if (err.code === 'ACTION_REJECTED') {
        setDeleteError('Signature rejected. Please approve the signature to delete the file.');
      } else if (err.response?.status === 403) {
        setDeleteError('You do not have permission to delete this file.');
      } else if (err.response?.status === 404) {
        setDeleteError('File not found.');
        await fetchFiles(); // Refresh list
      } else if (err.response?.status === 410) {
        setDeleteError('File has already been deleted.');
        await fetchFiles(); // Refresh list
      } else {
        setDeleteError(err.response?.data?.message || 'Failed to delete file. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  }, [fileToDelete, signer, walletAddress, fetchFiles, closeDeleteDialog]);

  // Render when wallet not connected
  if (!isConnected) {
    return (
      <Card sx={{ maxWidth: 900, margin: '20px auto' }}>
        <CardContent>
          <Alert severity="info">
            Please connect your wallet to view your uploaded files.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 900, margin: '20px auto' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            My Files
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastRefresh && (
              <Typography variant="caption" color="text.secondary">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={fetchFiles} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && files.length === 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="30%">Filename</TableCell>
                  <TableCell width="15%">Upload Date</TableCell>
                  <TableCell width="12%">Views</TableCell>
                  <TableCell width="15%">Expires In</TableCell>
                  <TableCell width="10%">Status</TableCell>
                  <TableCell width="18%" align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <FileTableRowSkeleton rows={3} />
              </TableBody>
            </Table>
          </TableContainer>
        ) : files.length === 0 ? (
          <Alert severity="info">
            You haven't uploaded any files yet.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="30%">Filename</TableCell>
                  <TableCell width="15%">Upload Date</TableCell>
                  <TableCell width="12%">Views</TableCell>
                  <TableCell width="15%">Expires In</TableCell>
                  <TableCell width="10%">Status</TableCell>
                  <TableCell width="18%" align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file) => (
                  <>
                    <TableRow 
                      key={file.id}
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        cursor: 'pointer',
                        opacity: file.isExpired || file.status !== 'active' ? 0.6 : 1
                      }}
                      onClick={() => toggleExpand(file.id)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {expandedFileId === file.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {file.originalName || file.filename}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(file.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VisibilityIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {file.viewsRemaining} / {file.viewLimit}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatTimeRemaining(file.timeRemaining)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(file.status, file.isExpired)}
                          color={getStatusColor(file.status, file.isExpired)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                          {file.status === 'active' && !file.isExpired && (
                            <Tooltip title={copiedId === file.id ? 'Copied!' : 'Copy Share Link'}>
                              <IconButton 
                                size="small" 
                                onClick={() => copyShareLink(file)}
                                color={copiedId === file.id ? 'success' : 'default'}
                              >
                                {copiedId === file.id ? <CheckCircleIcon /> : <ContentCopyIcon />}
                              </IconButton>
                            </Tooltip>
                          )}
                          {file.status === 'active' && (
                            <Tooltip title="Delete File">
                              <IconButton 
                                size="small" 
                                onClick={() => openDeleteDialog(file)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>

                    
                    {/* Expanded Details Row */}
                    <TableRow key={`${file.id}-details`}>
                      <TableCell colSpan={6} sx={{ py: 0, borderBottom: expandedFileId === file.id ? 1 : 0 }}>
                        <Collapse in={expandedFileId === file.id} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              File Details
                            </Typography>
                            <Divider sx={{ mb: 1 }} />
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">File Size</Typography>
                                <Typography variant="body2">{formatFileSize(file.fileSize)}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Expiry Time</Typography>
                                <Typography variant="body2">{formatDate(file.expiryTime)}</Typography>
                              </Box>
                              <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="caption" color="text.secondary">Transaction Hash</Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  {file.transactionHash}
                                </Typography>
                              </Box>
                              <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="caption" color="text.secondary">File Hash (SHA-256)</Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  {file.fileHash}
                                </Typography>
                              </Box>
                              {file.blockNumber && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Block Number</Typography>
                                  <Typography variant="body2">{file.blockNumber}</Typography>
                                </Box>
                              )}
                              {file.status === 'active' && !file.isExpired && (
                                <Box sx={{ gridColumn: '1 / -1' }}>
                                  <Typography variant="caption" color="text.secondary">Share Link</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        wordBreak: 'break-all', 
                                        fontFamily: 'monospace', 
                                        fontSize: '0.75rem',
                                        flex: 1 
                                      }}
                                    >
                                      {`http://localhost:5173/download/${file.accessToken}`}
                                    </Typography>
                                    <Tooltip title={copiedId === file.id ? 'Copied!' : 'Copy'}>
                                      <IconButton 
                                        size="small" 
                                        onClick={() => copyShareLink(file)}
                                        color={copiedId === file.id ? 'success' : 'default'}
                                      >
                                        {copiedId === file.id ? <CheckCircleIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={closeDeleteDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete File</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{fileToDelete?.originalName || fileToDelete?.filename}"?
            </DialogContentText>
            <DialogContentText sx={{ mt: 1, color: 'warning.main' }}>
              This action cannot be undone. The share link will be invalidated immediately.
            </DialogContentText>
            {deleteError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {deleteError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteFile} 
              color="error" 
              variant="contained"
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FileManager;
