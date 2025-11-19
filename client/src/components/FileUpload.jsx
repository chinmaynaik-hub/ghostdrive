import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Card, 
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [deleteAfter, setDeleteAfter] = useState(1);
  const [expiryTime, setExpiryTime] = useState(24);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setStatus('');
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deleteAfterViews', deleteAfter);
    formData.append('expiresIn', expiryTime);

    try {
      const response = await axios.post('http://localhost:3001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setStatus('File uploaded successfully! Share ID: ' + response.data.fileId);
    } catch (error) {
      setStatus('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <Card sx={{ maxWidth: 600, margin: '0 auto' }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            size="large"
          >
            Select File
            <input
              type="file"
              hidden
              onChange={handleFileChange}
            />
          </Button>

          {file && (
            <Typography variant="body1">
              Selected file: {file.name}
            </Typography>
          )}

          <FormControl fullWidth>
            <InputLabel>Delete after views</InputLabel>
            <Select
              value={deleteAfter}
              label="Delete after views"
              onChange={(e) => setDeleteAfter(e.target.value)}
            >
              <MenuItem value={1}>1 view</MenuItem>
              <MenuItem value={3}>3 views</MenuItem>
              <MenuItem value={5}>5 views</MenuItem>
              <MenuItem value={10}>10 views</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Expiry time (hours)</InputLabel>
            <Select
              value={expiryTime}
              label="Expiry time (hours)"
              onChange={(e) => setExpiryTime(e.target.value)}
            >
              <MenuItem value={1}>1 hour</MenuItem>
              <MenuItem value={24}>24 hours</MenuItem>
              <MenuItem value={48}>48 hours</MenuItem>
              <MenuItem value={168}>1 week</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            size="large"
            fullWidth
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload File'}
          </Button>

          {status && (
            <Alert severity={status.includes('successfully') ? 'success' : 'error'}>
              {status}
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default FileUpload; 