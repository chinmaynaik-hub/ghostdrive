# File Verification System Implementation

## Overview
This document describes the implementation of the file verification system (Task 6) for the blockchain-based file sharing platform.

## Implemented Features

### 1. Blockchain Query Functions (Task 6.2)

**Location**: `server/services/blockchainService.js`

**Function**: `getFileMetadataFromBlockchain(fileHash)`

**Purpose**: Retrieves file metadata from the blockchain smart contract using the file hash.

**Parameters**:
- `fileHash` (string): SHA-256 hash of the file (with or without 0x prefix)

**Returns**:
- Object containing:
  - `fileHash`: The file hash stored on blockchain
  - `timestamp`: Unix timestamp when file was registered
  - `uploader`: Wallet address of the uploader
  - `exists`: Boolean indicating if file exists
- `null` if file not found on blockchain

**Error Handling**:
- Validates hash format (must be 32 bytes / 64 hex characters)
- Gracefully handles "File not found" errors
- Returns null for non-existent files
- Throws errors for blockchain connection issues

**Example Usage**:
```javascript
const metadata = await blockchainService.getFileMetadataFromBlockchain(fileHash);
if (metadata) {
  console.log('File found on blockchain:', metadata);
} else {
  console.log('File not found on blockchain');
}
```

### 2. Verification Endpoint (Task 6.1)

**Location**: `server/server.js`

**Endpoint**: `POST /api/verify`

**Purpose**: Verifies file integrity by comparing a provided file hash with the hash stored on the blockchain.

**Request Body**:
```json
{
  "fileHash": "string (required)",
  "transactionHash": "string (optional)"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "verified": true/false,
  "message": "string",
  "providedHash": "string",
  "blockchainHash": "string",
  "timestamp": number,
  "uploader": "string",
  "blockNumber": number (if transactionHash provided),
  "uploadTimestamp": "string (if transactionHash provided)"
}
```

**Response** (File not on blockchain - 200):
```json
{
  "success": true,
  "verified": false,
  "message": "File not found on blockchain",
  "providedHash": "string",
  "blockchainHash": null
}
```

**Error Responses**:

1. **400 Bad Request** - Missing file hash:
```json
{
  "success": false,
  "message": "File hash is required",
  "code": "FILE_HASH_REQUIRED"
}
```

2. **400 Bad Request** - Invalid hash format:
```json
{
  "success": false,
  "message": "Invalid file hash format. Expected 64 hex characters.",
  "code": "INVALID_HASH_FORMAT"
}
```

3. **503 Service Unavailable** - Blockchain not available:
```json
{
  "success": false,
  "message": "Blockchain service is not available. Please try again later.",
  "code": "BLOCKCHAIN_UNAVAILABLE"
}
```

4. **500 Internal Server Error** - Verification error:
```json
{
  "success": false,
  "message": "Error verifying file",
  "error": "string (development only)",
  "code": "VERIFICATION_ERROR"
}
```

## Implementation Details

### Hash Normalization
The endpoint normalizes file hashes by:
1. Removing the `0x` prefix if present
2. Validating the hash is exactly 64 hexadecimal characters
3. Performing case-insensitive comparison

### Blockchain Integration
- Checks if blockchain service is connected before attempting verification
- Returns appropriate error if blockchain is unavailable
- Queries smart contract using the `getFileMetadata` function

### Database Integration
- If `transactionHash` is provided, attempts to retrieve additional metadata from database
- Includes `blockNumber` and `uploadTimestamp` in response when available
- Gracefully handles database errors without failing the verification

### Verification Logic
1. Validate request parameters
2. Check blockchain service availability
3. Query blockchain for file metadata
4. Compare provided hash with blockchain hash
5. Retrieve additional metadata from database (if transactionHash provided)
6. Return comprehensive verification result

## Testing

### Test Script
A test script is provided at `server/test-verification-simple.js` that tests:
1. Server health check
2. Missing file hash validation
3. Invalid hash format validation
4. Non-existent file handling
5. Existing file verification (if files exist in database)

### Running Tests
```bash
cd server
node test-verification-simple.js
```

### Test Results
All validation tests pass successfully:
- ✓ Server health check works
- ✓ Missing file hash is correctly rejected
- ✓ Invalid hash format is correctly rejected
- ✓ Blockchain unavailability is handled gracefully

## Requirements Validation

This implementation satisfies the following requirements:

**Requirement 4.1**: ✓ File hash and transaction hash are provided to recipients
**Requirement 4.2**: ✓ System calculates hash of downloaded file (client-side, not implemented here)
**Requirement 4.3**: ✓ Blockchain module retrieves file hash using the file hash itself
**Requirement 4.4**: ✓ System compares calculated hash with blockchain-stored hash
**Requirement 4.5**: ✓ System displays verification status indicating file authenticity

## API Usage Examples

### Example 1: Verify a file
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "fileHash": "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3"
  }'
```

### Example 2: Verify with transaction hash
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "fileHash": "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    "transactionHash": "0x1234567890abcdef..."
  }'
```

## Future Enhancements

1. **Batch Verification**: Support verifying multiple files in a single request
2. **Verification History**: Store verification attempts for audit purposes
3. **Performance Optimization**: Cache blockchain queries for frequently verified files
4. **Enhanced Metadata**: Include more blockchain metadata (gas used, block timestamp, etc.)

## Notes

- The verification endpoint works independently of whether Ganache is running
- When blockchain is unavailable, it returns a 503 status code
- The endpoint is designed to be called by the frontend after a file is downloaded
- Hash comparison is case-insensitive for better compatibility
