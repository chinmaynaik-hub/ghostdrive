import { 
  Alert, 
  AlertTitle, 
  Box, 
  Button, 
  Collapse,
  IconButton,
  Typography 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState } from 'react';

/**
 * Error Display Component
 * 
 * Displays user-friendly error messages with optional retry functionality.
 * Handles different error types and provides appropriate recovery options.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

// Error type to severity mapping
const ERROR_SEVERITY = {
  VALIDATION_ERROR: 'warning',
  INVALID_WALLET_ADDRESS: 'warning',
  WALLET_ADDRESS_REQUIRED: 'warning',
  FILE_REQUIRED: 'warning',
  FILE_TOO_LARGE: 'warning',
  
  UNAUTHORIZED: 'error',
  FORBIDDEN: 'error',
  SIGNATURE_VERIFICATION_FAILED: 'error',
  
  FILE_NOT_FOUND: 'info',
  FILE_EXPIRED: 'info',
  VIEW_LIMIT_REACHED: 'info',
  FILE_NOT_ACTIVE: 'info',
  
  BLOCKCHAIN_ERROR: 'error',
  BLOCKCHAIN_UNAVAILABLE: 'error',
  NETWORK_ERROR: 'error',
  INSUFFICIENT_FUNDS: 'error',
  
  INTERNAL_ERROR: 'error',
  DATABASE_ERROR: 'error'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_WALLET_ADDRESS: 'The wallet address format is invalid. Please check and try again.',
  WALLET_ADDRESS_REQUIRED: 'Please connect your wallet to continue.',
  FILE_REQUIRED: 'Please select a file to upload.',
  FILE_TOO_LARGE: 'The file is too large. Please select a smaller file.',
  
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission.',
  SIGNATURE_VERIFICATION_FAILED: 'Wallet signature verification failed. Please try signing again.',
  MISSING_AUTH_HEADERS: 'Authentication required. Please sign the request with your wallet.',
  
  FILE_NOT_FOUND: 'The requested file could not be found.',
  FILE_EXPIRED: 'This file has expired and is no longer available.',
  VIEW_LIMIT_REACHED: 'This file has reached its view limit and is no longer available.',
  FILE_NOT_ACTIVE: 'This file is no longer available for download.',
  ALREADY_DELETED: 'This file has already been deleted.',
  
  BLOCKCHAIN_ERROR: 'Blockchain transaction failed. Please try again.',
  BLOCKCHAIN_UNAVAILABLE: 'Blockchain service is currently unavailable. Please try again later.',
  NETWORK_ERROR: 'Network connection error. Please check your connection and try again.',
  INSUFFICIENT_FUNDS: 'Insufficient funds for gas fees. Please add funds to your wallet.',
  TRANSACTION_REJECTED: 'Transaction was rejected. Please approve the transaction in your wallet.',
  NONCE_ERROR: 'Transaction error. Please try again.',
  
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.'
};

const ErrorDisplay = ({ 
  error, 
  onClose, 
  onRetry, 
  showDetails = false,
  dismissible = true,
  retryable = false
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!error) return null;

  // Parse error object
  const errorCode = error.code || 'INTERNAL_ERROR';
  const errorMessage = error.message || ERROR_MESSAGES[errorCode] || 'An unexpected error occurred.';
  const severity = ERROR_SEVERITY[errorCode] || 'error';
  const isRetryable = retryable || error.retryable;

  // Get user-friendly message
  const userMessage = ERROR_MESSAGES[errorCode] || errorMessage;

  return (
    <Alert 
      severity={severity}
      sx={{ mb: 2 }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {showDetails && error.message && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
          {dismissible && onClose && (
            <IconButton
              size="small"
              onClick={onClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      }
    >
      <AlertTitle sx={{ fontWeight: 'bold' }}>
        {severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : 'Notice'}
      </AlertTitle>
      
      <Typography variant="body2">
        {userMessage}
      </Typography>

      {/* Expandable details section */}
      <Collapse in={expanded}>
        {error.message && error.message !== userMessage && (
          <Typography 
            variant="caption" 
            component="pre" 
            sx={{ 
              mt: 1, 
              p: 1, 
              bgcolor: 'action.hover',
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {error.message}
          </Typography>
        )}
        {error.code && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Error Code: {error.code}
          </Typography>
        )}
      </Collapse>

      {/* Retry button */}
      {isRetryable && onRetry && (
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ mt: 1 }}
          variant="outlined"
          color={severity}
        >
          Try Again
        </Button>
      )}
    </Alert>
  );
};

/**
 * Parse API error response into a standardized format
 */
export const parseApiError = (error) => {
  // Axios error with response
  if (error.response) {
    const { data, status } = error.response;
    return {
      message: data.message || 'An error occurred',
      code: data.code || `HTTP_${status}`,
      status,
      retryable: data.retryable || false,
      originalError: error
    };
  }
  
  // Network error
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return {
      message: 'Network connection error. Please check your connection.',
      code: 'NETWORK_ERROR',
      retryable: true,
      originalError: error
    };
  }
  
  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT_ERROR',
      retryable: true,
      originalError: error
    };
  }
  
  // Generic error
  return {
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'UNKNOWN_ERROR',
    retryable: false,
    originalError: error
  };
};

/**
 * Parse blockchain/wallet error into a standardized format
 */
export const parseBlockchainError = (error) => {
  const message = error.message?.toLowerCase() || '';
  
  // User rejected transaction
  if (error.code === 4001 || message.includes('rejected') || message.includes('denied')) {
    return {
      message: 'Transaction was rejected. Please approve the transaction in your wallet.',
      code: 'TRANSACTION_REJECTED',
      retryable: true,
      originalError: error
    };
  }
  
  // Pending request
  if (error.code === -32002 || message.includes('pending')) {
    return {
      message: 'A request is already pending. Please check your wallet.',
      code: 'REQUEST_PENDING',
      retryable: false,
      originalError: error
    };
  }
  
  // Insufficient funds
  if (message.includes('insufficient funds') || message.includes('gas')) {
    return {
      message: 'Insufficient funds for gas fees. Please add funds to your wallet.',
      code: 'INSUFFICIENT_FUNDS',
      retryable: false,
      originalError: error
    };
  }
  
  // Network error
  if (message.includes('network') || message.includes('connection')) {
    return {
      message: 'Cannot connect to blockchain network. Please check your connection.',
      code: 'NETWORK_ERROR',
      retryable: true,
      originalError: error
    };
  }
  
  // Generic blockchain error
  return {
    message: error.message || 'Blockchain transaction failed',
    code: 'BLOCKCHAIN_ERROR',
    retryable: true,
    originalError: error
  };
};

export default ErrorDisplay;
