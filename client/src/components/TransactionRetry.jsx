import { useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Chip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Transaction Retry Component
 * 
 * Allows manual retry for failed blockchain transactions.
 * Shows retry attempts remaining and provides clear feedback.
 * 
 * Requirements: 1.4, 10.3
 */

const MAX_RETRIES = 3;

const TransactionRetry = ({ 
  error,
  onRetry,
  onCancel,
  maxRetries = MAX_RETRIES,
  transactionType = 'blockchain transaction'
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [retrySuccess, setRetrySuccess] = useState(false);

  const attemptsRemaining = maxRetries - retryCount;
  const canRetry = attemptsRemaining > 0 && !isRetrying && !retrySuccess;

  const handleRetry = useCallback(async () => {
    if (!canRetry) return;

    setIsRetrying(true);
    setRetryError(null);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
      setRetrySuccess(true);
    } catch (err) {
      setRetryError(err);
    } finally {
      setIsRetrying(false);
    }
  }, [canRetry, onRetry]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Success state
  if (retrySuccess) {
    return (
      <Alert severity="success" icon={<CheckCircleIcon />}>
        <AlertTitle>Transaction Successful</AlertTitle>
        The {transactionType} completed successfully on retry.
      </Alert>
    );
  }

  // Get error message
  const errorMessage = retryError?.message || error?.message || 'Transaction failed';
  const errorCode = retryError?.code || error?.code || 'UNKNOWN_ERROR';

  // Determine if error is retryable
  const isRetryable = error?.retryable !== false && 
    !errorCode.includes('REJECTED') && 
    !errorCode.includes('INSUFFICIENT_FUNDS');

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        borderLeft: '4px solid',
        borderColor: 'error.main',
        bgcolor: 'error.lighter'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 32, mt: 0.5 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" color="error.dark" gutterBottom>
            {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Failed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {errorMessage}
          </Typography>
          {errorCode && (
            <Chip 
              label={errorCode} 
              size="small" 
              sx={{ mt: 1 }} 
              color="error"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Retry progress indicator */}
      {isRetrying && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">
              Retrying {transactionType}... (Attempt {retryCount} of {maxRetries})
            </Typography>
          </Box>
          <LinearProgress />
        </Box>
      )}

      {/* Retry attempts indicator */}
      {!isRetrying && isRetryable && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {attemptsRemaining > 0 ? (
              <>
                <strong>{attemptsRemaining}</strong> retry attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
              </>
            ) : (
              'No retry attempts remaining'
            )}
          </Typography>
          
          {/* Visual indicator of attempts */}
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
            {Array.from({ length: maxRetries }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 24,
                  height: 8,
                  borderRadius: 1,
                  bgcolor: index < retryCount ? 'error.main' : 'grey.300'
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {isRetryable && canRetry && (
          <Button
            variant="contained"
            color="primary"
            startIcon={isRetrying ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Retry Transaction'}
          </Button>
        )}
        
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<CancelIcon />}
          onClick={handleCancel}
          disabled={isRetrying}
        >
          Cancel
        </Button>
      </Box>

      {/* Help text for non-retryable errors */}
      {!isRetryable && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Cannot Retry</AlertTitle>
          {errorCode.includes('REJECTED') && (
            'The transaction was rejected. Please try the operation again from the beginning.'
          )}
          {errorCode.includes('INSUFFICIENT_FUNDS') && (
            'Please add funds to your wallet and try again.'
          )}
          {!errorCode.includes('REJECTED') && !errorCode.includes('INSUFFICIENT_FUNDS') && (
            'This error cannot be resolved by retrying. Please try the operation again.'
          )}
        </Alert>
      )}

      {/* Max retries reached */}
      {attemptsRemaining === 0 && !retrySuccess && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <AlertTitle>Maximum Retries Reached</AlertTitle>
          The {transactionType} failed after {maxRetries} attempts. 
          Please check your network connection and wallet, then try the operation again.
        </Alert>
      )}
    </Paper>
  );
};

/**
 * Hook for managing transaction retry state
 */
export const useTransactionRetry = (maxRetries = MAX_RETRIES) => {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const attemptsRemaining = maxRetries - retryCount;
  const canRetry = attemptsRemaining > 0 && !isRetrying;

  const handleError = useCallback((err) => {
    setError(err);
  }, []);

  const retry = useCallback(async (operation) => {
    if (!canRetry) return { success: false, error: new Error('No retries remaining') };

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await operation();
      setError(null);
      return { success: true, result };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsRetrying(false);
    }
  }, [canRetry]);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    error,
    retryCount,
    attemptsRemaining,
    isRetrying,
    canRetry,
    handleError,
    retry,
    reset
  };
};

export default TransactionRetry;
