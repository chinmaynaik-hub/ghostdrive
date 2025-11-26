import { useState, useCallback, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { useWallet } from '../context/WalletContext';
import TransactionRetry from './TransactionRetry';
import { parseApiError } from './ErrorDisplay';
import HelpTooltip, { HelpTexts } from './HelpTooltip';

// Upload stages for progress tracking
const UPLOAD_STAGES = ['Select File', 'Hashing', 'Uploading', 'Blockchain', 'Complete'];

// Calculate SHA-256 hash of a file in the browser
const calculateFileHashInBrowser = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
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

const FileUpload = () => {
  const { walletAddress, isConnected, connectWallet, isConnecting } = useWallet();
  
  // File state
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState(null);
  
  // Configuration state
  const [viewLimit, setViewLimit] = useState(1);
  const [expiryTime, setExpiryTime] = useState(24);
  const [anonymousMode, setAnonymousMode] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transactionStatus, setTransactionStatus] = useState('idle'); // idle, hashing, uploading, blockchain, complete, error
  const [activeStep, setActiveStep] = useState(0);
  
  // Result state
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Retry state for blockchain transactions
  const [showRetry, setShowRetry] = useState(false);
  const [retryData, setRetryData] = useState(null);
  const maxRetries = 3;
  
  // Ref to store form data for retry
  const formDataRef = useRef(null);

  // Handle file selection
  const handleFileChange = useCallback(async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setFileHash(null);
    setError(null);
    setUploadResult(null);
    setActiveStep(0);
    setTransactionStatus('idle');
  }, []);

  // Calculate hash when file is selected
  const calculateHash = useCallback(async () => {
    if (!file) return null;
    
    setTransactionStatus('hashing');
    setActiveStep(1);
    
    try {
      const hash = await calculateFileHashInBrowser(file);
      setFileHash(hash);
      return hash;
    } catch (err) {
      setError('Failed to calculate file hash: ' + err.message);
      setTransactionStatus('error');
      return null;
    }
  }, [file]);

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (!isConnected || !walletAddress) {
      setError('Please connect your wallet before uploading');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);
    
    try {
      // Stage 1: Calculate file hash
      const hash = await calculateHash();
      if (!hash) {
        setUploading(false);
        return;
      }

      // Stage 2: Upload file
      setTransactionStatus('uploading');
      setActiveStep(2);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deleteAfterViews', viewLimit);
      formData.append('expiresIn', expiryTime);
      formData.append('walletAddress', walletAddress);
      formData.append('anonymousMode', anonymousMode);
      formData.append('fileHash', hash);

      // Stage 3: Blockchain recording (handled by server)
      setTransactionStatus('blockchain');
      setActiveStep(3);

      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      // Stage 4: Complete
      setTransactionStatus('complete');
      setActiveStep(4);
      
      setUploadResult({
        success: true,
        fileId: response.data.fileId,
        accessToken: response.data.accessToken,
        shareLink: response.data.shareLink || `http://localhost:5173/download/${response.data.accessToken}`,
        transactionHash: response.data.transactionHash,
        blockNumber: response.data.blockNumber,
        fileHash: response.data.fileHash || hash
      });
      
    } catch (err) {
      setTransactionStatus('error');
      
      // Parse the error for consistent handling
      const parsedError = parseApiError(err);
      
      // Check if this is a blockchain-related error that can be retried
      const isBlockchainError = parsedError.message?.toLowerCase().includes('blockchain') ||
                                parsedError.code === 'BLOCKCHAIN_ERROR' ||
                                parsedError.code === 'BLOCKCHAIN_UNAVAILABLE' ||
                                parsedError.code === 'NETWORK_ERROR';
      
      if (isBlockchainError && parsedError.retryable !== false) {
        // Store form data for retry
        const retryFormData = new FormData();
        retryFormData.append('file', file);
        retryFormData.append('deleteAfterViews', viewLimit);
        retryFormData.append('expiresIn', expiryTime);
        retryFormData.append('walletAddress', walletAddress);
        retryFormData.append('anonymousMode', anonymousMode);
        retryFormData.append('fileHash', fileHash);
        formDataRef.current = retryFormData;
        
        setRetryData({
          error: parsedError,
          fileHash: fileHash
        });
        setShowRetry(true);
        setError(null); // Clear regular error to show retry UI
      } else {
        // Handle non-retryable errors
        if (err.response) {
          const { status, data } = err.response;
          
          if (status === 400) {
            if (data.code === 'WALLET_ADDRESS_REQUIRED') {
              setError('Wallet address is required. Please connect your wallet.');
            } else if (data.code === 'INVALID_WALLET_ADDRESS') {
              setError('Invalid wallet address format.');
            } else {
              setError(data.message || 'Invalid request');
            }
          } else if (status === 500) {
            setError(data.message || 'Server error. Please try again later.');
          } else {
            setError(data.message || 'Upload failed');
          }
        } else if (err.code === 'ERR_NETWORK') {
          setError('Network error. Please check your connection.');
        } else {
          setError('Upload failed: ' + err.message);
        }
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Handle retry for blockchain transactions
  const handleRetry = async () => {
    if (!formDataRef.current) {
      setError('Unable to retry. Please start a new upload.');
      setShowRetry(false);
      return;
    }
    
    setShowRetry(false);
    setUploading(true);
    setError(null);
    setTransactionStatus('blockchain');
    setActiveStep(3);
    
    try {
      const response = await axios.post('http://localhost:5000/api/upload', formDataRef.current, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      // Success
      setTransactionStatus('complete');
      setActiveStep(4);
      
      setUploadResult({
        success: true,
        fileId: response.data.fileId,
        accessToken: response.data.accessToken,
        shareLink: response.data.shareLink || `http://localhost:5173/download/${response.data.accessToken}`,
        transactionHash: response.data.transactionHash,
        blockNumber: response.data.blockNumber,
        fileHash: response.data.fileHash || retryData?.fileHash
      });
      
      formDataRef.current = null;
      setRetryData(null);
      
    } catch (err) {
      setTransactionStatus('error');
      const parsedError = parseApiError(err);
      
      // Check if we can retry again
      const isBlockchainError = parsedError.message?.toLowerCase().includes('blockchain') ||
                                parsedError.code === 'BLOCKCHAIN_ERROR';
      
      if (isBlockchainError && parsedError.retryable !== false) {
        setRetryData({
          error: parsedError,
          fileHash: retryData?.fileHash
        });
        setShowRetry(true);
      } else {
        setError(parsedError.message || 'Retry failed. Please try uploading again.');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Handle cancel retry
  const handleCancelRetry = () => {
    setShowRetry(false);
    setRetryData(null);
    formDataRef.current = null;
    setTransactionStatus('idle');
    setActiveStep(0);
  };

  // Copy share link to clipboard
  const copyShareLink = useCallback(async () => {
    if (!uploadResult?.shareLink) return;
    
    try {
      await navigator.clipboard.writeText(uploadResult.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  }, [uploadResult]);

  // Reset form
  const resetForm = useCallback(() => {
    setFile(null);
    setFileHash(null);
    setUploadResult(null);
    setError(null);
    setTransactionStatus('idle');
    setActiveStep(0);
    setUploadProgress(0);
    setShowRetry(false);
    setRetryData(null);
    formDataRef.current = null;
  }, []);

  // Get status color
  const getStatusColor = () => {
    switch (transactionStatus) {
      case 'complete': return 'success';
      case 'error': return 'error';
      case 'hashing':
      case 'uploading':
      case 'blockchain': return 'info';
      default: return 'primary';
    }
  };

  // Get status message
  const getStatusMessage = () => {
    switch (transactionStatus) {
      case 'hashing': return 'Calculating file hash...';
      case 'uploading': return 'Uploading file...';
      case 'blockchain': return 'Recording on blockchain...';
      case 'complete': return 'Upload complete!';
      case 'error': return 'Upload failed';
      default: return '';
    }
  };

  return (
    <Card sx={{ maxWidth: 700, margin: '0 auto' }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Wallet Connection Check */}
          {!isConnected && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Please connect your wallet to upload files</Typography>
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={connectWallet}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </Box>
            </Alert>
          )}

          {/* Progress Stepper */}
          {uploading && (
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
              {UPLOAD_STAGES.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          {/* Status Message */}
          {transactionStatus !== 'idle' && transactionStatus !== 'complete' && (
            <Alert severity={getStatusColor()} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {uploading && <CircularProgress size={20} />}
                <Typography>{getStatusMessage()}</Typography>
              </Box>
              {transactionStatus === 'uploading' && (
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ mt: 1 }}
                />
              )}
            </Alert>
          )}

          {/* File Selection */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              size="large"
              disabled={uploading || !isConnected}
            >
              Select File
              <input
                type="file"
                hidden
                onChange={handleFileChange}
              />
            </Button>

            {file && (
              <Paper elevation={1} sx={{ p: 2, width: '100%' }}>
                <Typography variant="body1" fontWeight="medium">
                  Selected: {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Size: {(file.size / 1024).toFixed(2)} KB
                </Typography>
                {fileHash && (
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    Hash: {fileHash.substring(0, 16)}...{fileHash.substring(fileHash.length - 16)}
                  </Typography>
                )}
              </Paper>
            )}
          </Box>

          <Divider />

          {/* Configuration Options */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControl fullWidth disabled={uploading}>
                <InputLabel>View Limit</InputLabel>
                <Select
                  value={viewLimit}
                  label="View Limit"
                  onChange={(e) => setViewLimit(e.target.value)}
                >
                  <MenuItem value={1}>1 view</MenuItem>
                  <MenuItem value={3}>3 views</MenuItem>
                  <MenuItem value={5}>5 views</MenuItem>
                  <MenuItem value={10}>10 views</MenuItem>
                  <MenuItem value={25}>25 views</MenuItem>
                  <MenuItem value={50}>50 views</MenuItem>
                  <MenuItem value={100}>100 views</MenuItem>
                </Select>
              </FormControl>
              <HelpTooltip {...HelpTexts.viewLimit} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControl fullWidth disabled={uploading}>
                <InputLabel>Expiry Time</InputLabel>
                <Select
                  value={expiryTime}
                  label="Expiry Time"
                  onChange={(e) => setExpiryTime(e.target.value)}
                >
                  <MenuItem value={1}>1 hour</MenuItem>
                  <MenuItem value={6}>6 hours</MenuItem>
                  <MenuItem value={24}>24 hours</MenuItem>
                  <MenuItem value={48}>48 hours</MenuItem>
                  <MenuItem value={168}>1 week</MenuItem>
                  <MenuItem value={720}>30 days</MenuItem>
                </Select>
              </FormControl>
              <HelpTooltip {...HelpTexts.expiryTime} />
            </Box>

            {/* Anonymous Mode Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={anonymousMode}
                    onChange={(e) => setAnonymousMode(e.target.checked)}
                    disabled={uploading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Anonymous Mode</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hide your wallet address from file recipients
                    </Typography>
                  </Box>
                }
              />
              <HelpTooltip {...HelpTexts.anonymousMode} />
            </Box>
          </Box>

          {/* Upload Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading || !isConnected}
            size="large"
            fullWidth
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
          >
            {uploading ? 'Processing...' : 'Upload File'}
          </Button>

          {/* Transaction Retry UI */}
          {showRetry && retryData && (
            <TransactionRetry
              error={retryData.error}
              onRetry={handleRetry}
              onCancel={handleCancelRetry}
              maxRetries={maxRetries}
              transactionType="blockchain recording"
            />
          )}

          {/* Error Display */}
          {error && !showRetry && (
            <Alert severity="error" icon={<ErrorIcon />}>
              {error}
            </Alert>
          )}

          {/* Success Result */}
          {uploadResult?.success && (
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircleIcon />
                <Typography variant="h6">Upload Successful!</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Share Link */}
                <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Share Link:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        wordBreak: 'break-all', 
                        flex: 1,
                        color: 'text.primary'
                      }}
                    >
                      {uploadResult.shareLink}
                    </Typography>
                    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                      <IconButton onClick={copyShareLink} size="small" color={copied ? 'success' : 'default'}>
                        {copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Transaction Hash */}
                {uploadResult.transactionHash && (
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Transaction Hash:</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.primary' }}>
                      {uploadResult.transactionHash}
                    </Typography>
                  </Box>
                )}

                {/* File Hash */}
                {uploadResult.fileHash && (
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">File Hash (SHA-256):</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.primary' }}>
                      {uploadResult.fileHash}
                    </Typography>
                  </Box>
                )}

                {/* Block Number */}
                {uploadResult.blockNumber && (
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Block Number:</Typography>
                    <Typography variant="body2" color="text.primary">
                      {uploadResult.blockNumber}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Button 
                variant="outlined" 
                onClick={resetForm} 
                sx={{ mt: 2, color: 'text.primary', borderColor: 'text.primary' }}
                fullWidth
              >
                Upload Another File
              </Button>
            </Paper>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
