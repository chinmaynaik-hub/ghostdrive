import React from 'react';
import { Box, Container, Typography, CssBaseline, ThemeProvider, createTheme, Tabs, Tab } from '@mui/material';
import { WalletProvider } from './context/WalletContext';
import FileUpload from './components/FileUpload';
import FileManager from './components/FileManager';
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

function App() {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} centered>
                <Tab label="Upload File" />
                <Tab label="My Files" />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              <FileUpload />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <FileManager />
            </TabPanel>
          </Box>
        </Container>
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
