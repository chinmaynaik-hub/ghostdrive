const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculate SHA-256 hash of a file
 * @param {string|Buffer} filePathOrBuffer - File path or buffer to hash
 * @returns {string} Hex string of the hash (without 0x prefix)
 */
function calculateFileHash(filePathOrBuffer) {
  try {
    let fileBuffer;
    
    if (Buffer.isBuffer(filePathOrBuffer)) {
      fileBuffer = filePathOrBuffer;
    } else if (typeof filePathOrBuffer === 'string') {
      fileBuffer = fs.readFileSync(filePathOrBuffer);
    } else {
      throw new Error('Input must be a file path string or Buffer');
    }

    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return hash;
  } catch (error) {
    throw new Error(`Failed to calculate file hash: ${error.message}`);
  }
}

/**
 * Verify if a file matches a given hash
 * @param {string|Buffer} filePathOrBuffer - File path or buffer to verify
 * @param {string} expectedHash - Expected hash (with or without 0x prefix)
 * @returns {boolean} True if hashes match
 */
function verifyFileHash(filePathOrBuffer, expectedHash) {
  try {
    const calculatedHash = calculateFileHash(filePathOrBuffer);
    
    // Normalize hashes (remove 0x prefix if present)
    const normalizedCalculated = calculatedHash.startsWith('0x') 
      ? calculatedHash.slice(2) 
      : calculatedHash;
    const normalizedExpected = expectedHash.startsWith('0x') 
      ? expectedHash.slice(2) 
      : expectedHash;
    
    return normalizedCalculated === normalizedExpected;
  } catch (error) {
    throw new Error(`Failed to verify file hash: ${error.message}`);
  }
}

/**
 * Calculate hash from a stream (useful for large files)
 * @param {ReadableStream} stream - File stream
 * @returns {Promise<string>} Hex string of the hash
 */
function calculateStreamHash(stream) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    
    stream.on('error', (error) => {
      reject(new Error(`Failed to calculate stream hash: ${error.message}`));
    });
  });
}

module.exports = {
  calculateFileHash,
  verifyFileHash,
  calculateStreamHash
};
