import React from 'react';
import { Box, Container, Typography, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { WalletProvider } from './context/WalletContext';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import WalletConnect from './components/WalletConnect';

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
      <WalletProvider>
        <Container maxWidth="lg">
          <Box sx={{ my: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom align="center">
              Secure File Sharing
            </Typography>
            <WalletConnect />
            <FileUpload />
          </Box>
        </Container>
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
