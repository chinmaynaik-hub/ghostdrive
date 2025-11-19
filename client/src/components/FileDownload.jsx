import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Card, 
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const FileDownload = () => {
  const { fileId } = useParams();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customFileId, setCustomFileId] = useState(fileId || '');

  const handleDownload = async (id) => {
    if (!id) {
      setError('Please enter a file ID');
      return;
    }

    setDownloading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.get(`http://localhost:5000/api/download/${id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `file-${id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('File downloaded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error downloading file');
    } finally {
      setDownloading(false);
    }
  };

  // If fileId is provided in URL, download automatically
  React.useEffect(() => {
    if (fileId) {
      handleDownload(fileId);
    }
  }, [fileId]);

  return (
    <Card sx={{ maxWidth: 600, margin: '20px auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Download Secure File
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="File ID"
            value={customFileId}
            onChange={(e) => setCustomFileId(e.target.value)}
            fullWidth
            disabled={downloading}
          />

          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownload(customFileId)}
            disabled={downloading || !customFileId}
            fullWidth
          >
            {downloading ? <CircularProgress size={24} /> : 'Download File'}
          </Button>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success">
              {success}
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default FileDownload; 