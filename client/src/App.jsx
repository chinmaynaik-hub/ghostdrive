import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  CssBaseline, 
  ThemeProvider, 
  createTheme, 
  AppBar,
  Toolbar,
  Button,
  Paper
} from '@mui/material';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';
import HomeIcon from '@mui/icons-material/Home';
import { WalletProvider } from './context/WalletContext';
import FileUpload from './components/FileUpload';
import FileManager from './components/FileManager';
import FileDownload from './components/FileDownload';
import WalletConnect from './components/WalletConnect';
import ErrorBoundary from './components/ErrorBoundary';

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

// Navigation component
function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Don't show full navigation on download pages with access token
  const isDownloadWithToken = location.pathname.startsWith('/download/') && location.pathname.length > 10;
  
  const navItems = [
    { path: '/', label: 'Upload', icon: <CloudUploadIcon /> },
    { path: '/files', label: 'My Files', icon: <FolderIcon /> },
    { path: '/download', label: 'Download', icon: <DownloadIcon /> },
  ];

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component={Link} 
          to="/"
          sx={{ 
            flexGrow: 0, 
            mr: 4, 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <HomeIcon />
          Secure File Sharing
        </Typography>
        
        {!isDownloadWithToken && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        )}
        
        <Box sx={{ flexGrow: 1 }} />
        
        <WalletConnect />
      </Toolbar>
    </AppBar>
  );
}

// Upload Page
function UploadPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Upload File
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Upload files securely with blockchain verification
        </Typography>
        <ErrorBoundary message="Failed to load the upload component. Please refresh the page.">
          <FileUpload />
        </ErrorBoundary>
      </Box>
    </Container>
  );
}

// File Manager Page
function FilesPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          My Files
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Manage your uploaded files and share links
        </Typography>
        <ErrorBoundary message="Failed to load your files. Please refresh the page.">
          <FileManager />
        </ErrorBoundary>
      </Box>
    </Container>
  );
}

// Download Page (for manual token entry)
function DownloadPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Download File
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Enter an access token to download a shared file
        </Typography>
        <ErrorBoundary message="Failed to load the download component. Please refresh the page.">
          <FileDownload />
        </ErrorBoundary>
      </Box>
    </Container>
  );
}

// Download Page with Access Token (for share links)
function DownloadWithTokenPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: 'primary.light', color: 'white', textAlign: 'center' }}>
          <Typography variant="body1">
            You're accessing a shared file. Preview the details below before downloading.
          </Typography>
        </Paper>
        <ErrorBoundary message="Failed to load the file. The link may be invalid or expired.">
          <FileDownload />
        </ErrorBoundary>
      </Box>
    </Container>
  );
}

// Main App Layout
function AppLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation />
      <Box component="main" sx={{ flexGrow: 1, backgroundColor: 'grey.50' }}>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/download/:accessToken" element={<DownloadWithTokenPage />} />
        </Routes>
      </Box>
      <Box 
        component="footer" 
        sx={{ 
          py: 2, 
          px: 2, 
          mt: 'auto', 
          backgroundColor: 'grey.200',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Blockchain-Based Secure File Sharing Platform
        </Typography>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary message="The application encountered an error. Please refresh the page or try again.">
        <WalletProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </WalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
