import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Card, 
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Paper,
  Stack
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FilePreviewSkeleton } from './SkeletonLoaders';
import HelpTooltip, { HelpTexts } from './HelpTooltip';

const API_BASE_URL = 'http://localhost:5000';

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format time remaining
const formatTimeRemaining = (expiryTime) => {
  const now = new Date();
  const expiry = new Date(expiryTime);
  const diff = expiry - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  }
  
  return `${hours}h ${minutes}m remaining`;
};

// Helper function to calculate SHA-256 hash of a file
const calculateFileHash = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};


const FileDownload = () => {
  const { accessToken: urlAccessToken } = useParams();
  const [accessToken, setAccessToken] = useState(urlAccessToken || '');
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Verification state
  const [verificationStatus, setVerificationStatus] = useState('not_verified'); // not_verified, verifying, verified, failed
  const [verificationResult, setVerificationResult] = useState(null);
  const [downloadedFile, setDownloadedFile] = useState(null);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch file preview information
  const fetchFileInfo = useCallback(async (token) => {
    if (!token) {
      setError('Please enter an access token');
      return;
    }

    // Validate access token format (64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError('Invalid access token format. Expected 64 character hex string.');
      return;
    }

    setLoading(true);
    setError('');
    setFileInfo(null);
    setVerificationStatus('not_verified');
    setVerificationResult(null);
    setDownloadedFile(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/file/${token}`);
      setFileInfo(response.data);
    } catch (err) {
      handleApiError(err, 'fetching file information');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle API errors with appropriate messages
  const handleApiError = (err, action) => {
    const status = err.response?.status;
    const code = err.response?.data?.code;
    const message = err.response?.data?.message;

    if (status === 404) {
      setError('File not found. The share link may be invalid or the file has been deleted.');
    } else if (status === 410) {
      if (code === 'FILE_EXPIRED' || message?.includes('expired')) {
        setError('This file has expired and is no longer available for download.');
      } else if (code === 'VIEW_LIMIT_REACHED' || message?.includes('View limit')) {
        setError('This file has reached its maximum download limit and is no longer available.');
      } else {
        setError('This file is no longer available.');
      }
    } else if (status === 400) {
      setError(message || 'Invalid request. Please check the access token.');
    } else if (!err.response) {
      setError('Network error. Please check your connection and try again.');
    } else {
      setError(message || `Error ${action}. Please try again.`);
    }
  };

  // Auto-fetch file info when URL contains access token
  useEffect(() => {
    if (urlAccessToken) {
      setAccessToken(urlAccessToken);
      fetchFileInfo(urlAccessToken);
    }
  }, [urlAccessToken, fetchFileInfo]);

  // Handle download button click - show confirmation dialog
  const handleDownloadClick = () => {
    setShowConfirmDialog(true);
  };

  // Confirm and proceed with download
  const handleConfirmDownload = async () => {
    setShowConfirmDialog(false);
    await downloadFile();
  };


  // Download the file
  const downloadFile = async () => {
    if (!accessToken) {
      setError('Please enter an access token');
      return;
    }

    setDownloading(true);
    setError('');
    setSuccess('');
    setVerificationStatus('not_verified');
    setVerificationResult(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/download/${accessToken}`, {
        responseType: 'blob'
      });
      
      // Get filename from Content-Disposition header or use file info
      let filename = fileInfo?.filename || 'downloaded-file';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Create blob and store for verification
      const blob = new Blob([response.data]);
      setDownloadedFile(blob);
      
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess('File downloaded successfully! You can now verify its integrity.');
      
      // Update file info to reflect decremented view count
      if (fileInfo) {
        setFileInfo(prev => ({
          ...prev,
          viewsRemaining: Math.max(0, prev.viewsRemaining - 1)
        }));
      }
    } catch (err) {
      handleApiError(err, 'downloading file');
    } finally {
      setDownloading(false);
    }
  };

  // Verify file integrity against blockchain
  const verifyFile = async () => {
    if (!downloadedFile) {
      setError('Please download the file first before verifying.');
      return;
    }

    if (!fileInfo?.fileHash) {
      setError('File hash information not available for verification.');
      return;
    }

    setVerificationStatus('verifying');
    setError('');

    try {
      // Calculate hash of downloaded file
      const calculatedHash = await calculateFileHash(downloadedFile);
      
      // Call verification endpoint
      const response = await axios.post(`${API_BASE_URL}/api/verify`, {
        fileHash: calculatedHash,
        transactionHash: fileInfo.transactionHash
      });

      setVerificationResult({
        ...response.data,
        calculatedHash
      });
      
      setVerificationStatus(response.data.verified ? 'verified' : 'failed');
    } catch (err) {
      setVerificationStatus('failed');
      setVerificationResult({
        verified: false,
        message: err.response?.data?.message || 'Verification failed due to an error'
      });
      setError(err.response?.data?.message || 'Error verifying file integrity');
    }
  };

  // Render verification status indicator
  const renderVerificationStatus = () => {
    if (verificationStatus === 'not_verified') {
      return null;
    }

    if (verificationStatus === 'verifying') {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography>Verifying file integrity against blockchain...</Typography>
          </Box>
        </Alert>
      );
    }

    if (verificationStatus === 'verified') {
      return (
        <Alert severity="success" icon={<VerifiedIcon />} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            File Verified Successfully
          </Typography>
          <Typography variant="body2">
            The file integrity has been verified against the blockchain record.
          </Typography>
          {verificationResult && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" display="block">
                Blockchain Hash: {verificationResult.blockchainHash?.substring(0, 16)}...
              </Typography>
              {verificationResult.timestamp && (
                <Typography variant="caption" display="block">
                  Recorded: {new Date(verificationResult.timestamp * 1000).toLocaleString()}
                </Typography>
              )}
              {verificationResult.blockNumber && (
                <Typography variant="caption" display="block">
                  Block Number: {verificationResult.blockNumber}
                </Typography>
              )}
            </Box>
          )}
        </Alert>
      );
    }

    if (verificationStatus === 'failed') {
      return (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Verification Failed
          </Typography>
          <Typography variant="body2">
            {verificationResult?.message || 'The file hash does not match the blockchain record. The file may have been tampered with.'}
          </Typography>
          {verificationResult && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" display="block">
                Calculated Hash: {verificationResult.calculatedHash?.substring(0, 16)}...
              </Typography>
              {verificationResult.blockchainHash && (
                <Typography variant="caption" display="block">
                  Blockchain Hash: {verificationResult.blockchainHash?.substring(0, 16)}...
                </Typography>
              )}
            </Box>
          )}
        </Alert>
      );
    }

    return null;
  };


  return (
    <Card sx={{ maxWidth: 700, margin: '20px auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Download Secure File
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Access Token Input */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Access Token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              fullWidth
              disabled={loading || downloading}
              placeholder="Enter 64-character access token"
              helperText="Paste the access token from your share link"
            />
            <Button
              variant="outlined"
              onClick={() => fetchFileInfo(accessToken)}
              disabled={loading || downloading || !accessToken}
              sx={{ minWidth: 100 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Preview'}
            </Button>
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Success Display */}
          {success && (
            <Alert severity="success" onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Loading Skeleton */}
          {loading && <FilePreviewSkeleton />}

          {/* File Preview Section */}
          {!loading && fileInfo && (
            <Paper elevation={2} sx={{ p: 2, mt: 1 }}>
              <Typography variant="h6" gutterBottom>
                File Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={1.5}>
                {/* Filename */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    Filename:
                  </Typography>
                  <Typography variant="body1">
                    {fileInfo.filename}
                  </Typography>
                </Box>

                {/* File Size */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    Size:
                  </Typography>
                  <Typography variant="body1">
                    {formatFileSize(fileInfo.fileSize)}
                  </Typography>
                </Box>

                {/* Upload Timestamp */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body1" fontWeight="bold">
                    Uploaded:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(fileInfo.uploadTimestamp).toLocaleString()}
                  </Typography>
                </Box>

                {/* Views Remaining */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VisibilityIcon fontSize="small" color="action" />
                  <Typography variant="body1" fontWeight="bold">
                    Views Remaining:
                  </Typography>
                  <Chip 
                    label={fileInfo.viewsRemaining} 
                    color={fileInfo.viewsRemaining <= 1 ? 'warning' : 'primary'}
                    size="small"
                  />
                  {fileInfo.viewsRemaining === 1 && (
                    <Chip 
                      icon={<WarningIcon />}
                      label="Last view!" 
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* Time Until Expiry */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body1" fontWeight="bold">
                    Expires:
                  </Typography>
                  <Typography variant="body1">
                    {formatTimeRemaining(fileInfo.expiryTime)}
                  </Typography>
                </Box>

                {/* File Hash */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <FingerprintIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
                  <Typography variant="body1" fontWeight="bold">
                    File Hash:
                  </Typography>
                  <HelpTooltip {...HelpTexts.fileHash} variant="info" />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      wordBreak: 'break-all',
                      backgroundColor: 'grey.100',
                      p: 0.5,
                      borderRadius: 1,
                      flex: 1
                    }}
                  >
                    {fileInfo.fileHash}
                  </Typography>
                </Box>

                {/* Uploader Address (conditional) */}
                {fileInfo.uploaderAddress && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body1" fontWeight="bold">
                      Uploader:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {fileInfo.uploaderAddress.substring(0, 6)}...{fileInfo.uploaderAddress.substring(38)}
                    </Typography>
                  </Box>
                )}

                {/* Transaction Hash */}
                {fileInfo.transactionHash && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      Transaction:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        backgroundColor: 'grey.100',
                        p: 0.5,
                        borderRadius: 1,
                        flex: 1
                      }}
                    >
                      {fileInfo.transactionHash}
                    </Typography>
                  </Box>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                  onClick={handleDownloadClick}
                  disabled={downloading || fileInfo.viewsRemaining <= 0}
                >
                  {downloading ? 'Downloading...' : 'Download File'}
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={verificationStatus === 'verifying' ? <CircularProgress size={20} /> : <VerifiedIcon />}
                  onClick={verifyFile}
                  disabled={!downloadedFile || verificationStatus === 'verifying'}
                >
                  {verificationStatus === 'verifying' ? 'Verifying...' : 'Verify File'}
                </Button>
              </Box>

              {/* Verification Status */}
              {renderVerificationStatus()}
            </Paper>
          )}
        </Box>
      </CardContent>

      {/* Download Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
      >
        <DialogTitle>
          {fileInfo?.viewsRemaining === 1 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
              <WarningIcon />
              Last Download Warning
            </Box>
          ) : (
            'Confirm Download'
          )}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {fileInfo?.viewsRemaining === 1 ? (
              <>
                <strong>Warning:</strong> This is the last available download for this file. 
                After this download, the file will be permanently deleted and the share link will no longer work.
                <br /><br />
                Are you sure you want to proceed?
              </>
            ) : (
              <>
                Downloading this file will consume 1 of {fileInfo?.viewsRemaining} remaining views.
                <br /><br />
                After download, {fileInfo?.viewsRemaining - 1} view(s) will remain.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDownload} 
            color={fileInfo?.viewsRemaining === 1 ? 'warning' : 'primary'}
            variant="contained"
            autoFocus
          >
            {fileInfo?.viewsRemaining === 1 ? 'Download Anyway' : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default FileDownload;
