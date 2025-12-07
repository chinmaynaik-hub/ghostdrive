const File = require('./models/File');
const sequelize = require('./config/database');

async function checkAllFiles() {
  try {
    await sequelize.sync();
    
    const files = await File.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${files.length} total files:\n`);
    
    files.forEach(f => {
      console.log(`ID: ${f.id}`);
      console.log(`  Name: ${f.originalName}`);
      console.log(`  Owner: ${f.uploaderAddress}`);
      console.log(`  Views: ${f.viewsRemaining}`);
      console.log(`  Status: ${f.status}`);
      console.log('');
    });
    
    if (files.length === 0) {
      console.log('No files found. You need to upload a file first to test deletion.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkAllFiles();
