// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FileRegistry
 * @dev Smart contract for storing immutable file metadata on blockchain
 */
contract FileRegistry {
    struct FileMetadata {
        bytes32 fileHash;
        uint256 timestamp;
        address uploader;
        bool exists;
    }

    // Mapping from transaction hash to file metadata
    mapping(bytes32 => FileMetadata) public files;
    
    // Array to store all file hashes for enumeration
    bytes32[] public fileHashes;

    event FileRegistered(
        bytes32 indexed fileHash,
        address indexed uploader,
        uint256 timestamp,
        uint256 blockNumber
    );

    /**
     * @dev Register a new file on the blockchain
     * @param _fileHash SHA-256 hash of the file content
     * @param _timestamp Unix timestamp of file upload
     */
    function registerFile(
        bytes32 _fileHash,
        uint256 _timestamp
    ) external returns (bool) {
        require(_fileHash != bytes32(0), "File hash cannot be empty");
        require(_timestamp > 0, "Timestamp must be valid");
        require(!files[_fileHash].exists, "File already registered");

        files[_fileHash] = FileMetadata({
            fileHash: _fileHash,
            timestamp: _timestamp,
            uploader: msg.sender,
            exists: true
        });

        fileHashes.push(_fileHash);

        emit FileRegistered(
            _fileHash,
            msg.sender,
            _timestamp,
            block.number
        );

        return true;
    }

    /**
     * @dev Get file metadata by file hash
     * @param _fileHash The hash of the file to query
     * @return FileMetadata struct containing file information
     */
    function getFileMetadata(bytes32 _fileHash) 
        external 
        view 
        returns (FileMetadata memory) 
    {
        require(files[_fileHash].exists, "File not found");
        return files[_fileHash];
    }

    /**
     * @dev Verify if a file hash matches the stored hash
     * @param _fileHash The hash to verify
     * @return bool indicating if the file is verified
     */
    function verifyFile(bytes32 _fileHash) 
        external 
        view 
        returns (bool) 
    {
        return files[_fileHash].exists;
    }

    /**
     * @dev Get total number of registered files
     * @return uint256 count of registered files
     */
    function getFileCount() external view returns (uint256) {
        return fileHashes.length;
    }

    /**
     * @dev Get file hash by index
     * @param _index Index in the fileHashes array
     * @return bytes32 file hash at the given index
     */
    function getFileHashByIndex(uint256 _index) 
        external 
        view 
        returns (bytes32) 
    {
        require(_index < fileHashes.length, "Index out of bounds");
        return fileHashes[_index];
    }
}
