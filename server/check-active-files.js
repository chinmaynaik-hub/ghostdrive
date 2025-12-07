const File = require('./models/File');
const sequelize = require('./config/database');

async function checkActiveFiles() {
  try {
    await sequelize.sync();
    
    const files = await File.findAll({
      where: { status: 'active' },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${files.length} active files:\n`);
    
    files.forEach(f => {
      console.log(`ID: ${f.id}`);
      console.log(`  Name: ${f.originalName}`);
      console.log(`  Owner: ${f.uploaderAddress}`);
      console.log(`  Views: ${f.viewsRemaining}`);
      console.log(`  Status: ${f.status}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkActiveFiles();
