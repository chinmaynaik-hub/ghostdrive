const { recoverPersonalSignature } = require('@metamask/eth-sig-util');
const { bufferToHex } = require('ethereumjs-util');

/**
 * Middleware to verify wallet signature for sensitive operations
 * 
 * Expected request headers:
 * - x-wallet-address: The wallet address claiming to make the request
 * - x-signature: The signature of the message
 * - x-message: The original message that was signed
 * 
 * The middleware verifies that the signature was created by the claimed wallet address
 */
function verifyWalletSignature(req, res, next) {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    const signature = req.headers['x-signature'];
    const message = req.headers['x-message'];

    // Check if all required headers are present
    if (!walletAddress || !signature || !message) {
      return res.status(401).json({
        success: false,
        message: 'Missing authentication headers. Required: x-wallet-address, x-signature, x-message',
        code: 'MISSING_AUTH_HEADERS'
      });
    }

    // Validate wallet address format
    const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletAddressRegex.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    // Recover the address from the signature
    const recoveredAddress = recoverPersonalSignature({
      data: message,
      signature: signature
    });

    // Compare recovered address with claimed address (case-insensitive)
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Signature verification failed. The signature does not match the claimed wallet address.',
        code: 'SIGNATURE_VERIFICATION_FAILED'
      });
    }

    // Attach verified wallet address to request for use in route handlers
    req.verifiedWalletAddress = walletAddress.toLowerCase();
    
    next();
  } catch (error) {
    console.error('Wallet signature verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying wallet signature',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'VERIFICATION_ERROR'
    });
  }
}

/**
 * Alternative verification using Web3
 * This function can be used directly in route handlers for custom verification logic
 */
async function verifySignatureWithWeb3(message, signature, expectedAddress) {
  try {
    const Web3 = require('web3');
    const web3 = new Web3();
    
    // Recover address from signature
    const recoveredAddress = web3.eth.accounts.recover(message, signature);
    
    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Web3 signature verification error:', error);
    return false;
  }
}

/**
 * Validates that a wallet address matches the expected format
 */
function isValidWalletAddress(address) {
  const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return walletAddressRegex.test(address);
}

module.exports = {
  verifyWalletSignature,
  verifySignatureWithWeb3,
  isValidWalletAddress
};
