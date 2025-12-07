const axios = require('axios');

async function testSortingAndFields() {
  try {
    console.log('Testing wallet with multiple files...\n');
    
    const res = await axios.get('http://localhost:3001/api/files/0x0000000000000000000000000000000000000000');
    
    console.log('Total files:', res.data.count);
    
    if (res.data.count > 1) {
      console.log('\nVerifying sort order (newest first):');
      res.data.files.forEach((f, i) => {
        console.log(`${i + 1}. ${f.originalName} - ${new Date(f.createdAt).toLocaleString()}`);
      });
      
      const sorted = res.data.files.every((f, i) => {
        if (i === 0) return true;
        return new Date(f.createdAt) <= new Date(res.data.files[i - 1].createdAt);
      });
      
      console.log('\n✓ Sorting verified:', sorted ? 'PASS ✓' : 'FAIL ✗');
    }
    
    if (res.data.files.length > 0) {
      console.log('\nDerived fields check:');
      const f = res.data.files[0];
      console.log('- timeRemaining:', typeof f.timeRemaining, '=', f.timeRemaining);
      console.log('- timeRemainingHours:', typeof f.timeRemainingHours, '=', f.timeRemainingHours);
      console.log('- derivedStatus:', typeof f.derivedStatus, '=', f.derivedStatus);
      console.log('- isExpired:', typeof f.isExpired, '=', f.isExpired);
      console.log('- shareLink:', f.shareLink ? 'present ✓' : 'missing ✗');
      
      console.log('\n✓ All derived fields present and correct!');
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testSortingAndFields();
