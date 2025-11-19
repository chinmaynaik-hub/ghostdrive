import React from 'react';
import { Box, Container, Typography, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Secure File Sharing
          </Typography>
          <FileUpload />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
