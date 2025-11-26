import React from 'react';
import { Box, Container, Typography, CssBaseline, ThemeProvider, createTheme, Tabs, Tab } from '@mui/material';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import FileUpload from './components/FileUpload';
import FileManager from './components/FileManager';
import FileDownload from './components/FileDownload';
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

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Main content component with tabs
function MainContent() {
  const [tabValue, setTabValue] = React.useState(0);
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 2) {
      navigate('/download');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Secure File Sharing
        </Typography>
        <WalletConnect />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="Upload File" />
            <Tab label="My Files" />
            <Tab label="Download File" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <FileUpload />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <FileManager />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <FileDownload />
        </TabPanel>
      </Box>
    </Container>
  );
}

// Download page component (for direct access via share link)
function DownloadPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Secure File Sharing
        </Typography>
        <FileDownload />
      </Box>
    </Container>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainContent />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/download/:accessToken" element={<DownloadPage />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
