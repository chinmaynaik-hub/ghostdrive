import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Link,
  Typography 
} from '@mui/material';

export default function FileList() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/files');
        setFiles(response.data);
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  if (loading) return <Typography>Loading files...</Typography>;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>File Name</TableCell>
            <TableCell>File Hash</TableCell>
            <TableCell>Expires At</TableCell>
            <TableCell>Views Remaining</TableCell>
            <TableCell>Download Link</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell>{file.filename}</TableCell>
              <TableCell>{new Date(file.expiresAt).toLocaleString()}</TableCell>
              <TableCell>{file.viewsRemaining}</TableCell>
              <TableCell>
                <Link href={`http://localhost:3001/api/download/${file.id}`}>
                  Download
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}