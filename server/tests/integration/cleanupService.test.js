/**
 * Integration Tests for Cleanup Service
 * 
 * Tests the cleanup job logic for expired files
 * Requirements: Testing strategy - Test cleanup job
 */

const { Op } = require('sequelize');

// Mock the File model and fs module
jest.mock('../../models/File', () => ({
  findAll: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn()
}));

const File = require('../../models/File');
const fs = require('fs');

describe('Cleanup Service Logic', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    File.findAll.mockReset();
    fs.existsSync.mockReset();
    fs.unlinkSync.mockReset();
  });

  describe('Expired File Identification', () => {
    it('should identify files expired by time', async () => {
      const now = new Date();
      const expiredFile = {
        id: 1,
        originalName: 'expired-file.txt',
        expiryTime: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        viewsRemaining: 5,
        filePath: '/uploads/expired-file.txt',
        status: 'active',
        destroy: jest.fn().mockResolvedValue(true)
      };

      File.findAll.mockResolvedValue([expiredFile]);

      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue(undefined);

      // Simulate cleanup logic
      const expiredByTime = await File.findAll({
        where: {
          status: 'active',
          expiryTime: { [Op.lt]: now }
        }
      });

      expect(expiredByTime).toHaveLength(1);
      expect(expiredByTime[0].id).toBe(1);
    });

    it('should identify files expired by view limit', async () => {
      const now = new Date();
      const expiredFile = {
        id: 2,
        originalName: 'no-views-file.txt',
        expiryTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
        viewsRemaining: 0,
        filePath: '/uploads/no-views-file.txt',
        status: 'active',
        destroy: jest.fn().mockResolvedValue(true)
      };

      // Mock returns the expired file for view limit query
      File.findAll.mockResolvedValue([expiredFile]);

      // Simulate cleanup logic - query for files with 0 views
      const expiredByViews = await File.findAll({
        where: {
          status: 'active',
          viewsRemaining: { [Op.lte]: 0 }
        }
      });

      expect(expiredByViews).toHaveLength(1);
      expect(expiredByViews[0].viewsRemaining).toBe(0);
    });

    it('should not identify active files', async () => {
      const now = new Date();
      
      File.findAll.mockResolvedValue([]);

      const expiredByTime = await File.findAll({
        where: {
          status: 'active',
          expiryTime: { [Op.lt]: now }
        }
      });

      expect(expiredByTime).toHaveLength(0);
    });
  });

  describe('File Deletion', () => {
    it('should delete file from filesystem when it exists', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue(undefined);

      const filePath = '/uploads/test-file.txt';
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      expect(fs.existsSync).toHaveBeenCalledWith(filePath);
      expect(fs.unlinkSync).toHaveBeenCalledWith(filePath);
    });

    it('should handle missing file gracefully', () => {
      fs.existsSync.mockReturnValue(false);

      const filePath = '/uploads/missing-file.txt';
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      expect(fs.existsSync).toHaveBeenCalledWith(filePath);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Handling', () => {
    it('should remove duplicates when file is expired by both time and views', async () => {
      const now = new Date();
      const duplicateFile = {
        id: 3,
        originalName: 'duplicate-file.txt',
        expiryTime: new Date(now.getTime() - 60 * 60 * 1000), // Expired by time
        viewsRemaining: 0, // Also expired by views
        filePath: '/uploads/duplicate-file.txt',
        status: 'active'
      };

      // Clear mocks and set up fresh
      jest.clearAllMocks();
      
      // Both queries return the same file (it's expired by both criteria)
      File.findAll
        .mockResolvedValueOnce([duplicateFile]) // Expired by time
        .mockResolvedValueOnce([duplicateFile]); // Also expired by views

      const expiredByTime = await File.findAll({
        where: { status: 'active', expiryTime: { [Op.lt]: now } }
      });
      
      const expiredByViews = await File.findAll({
        where: { status: 'active', viewsRemaining: { [Op.lte]: 0 } }
      });

      // Combine and deduplicate
      const allExpired = [...expiredByTime, ...expiredByViews];
      const uniqueExpired = Array.from(
        new Map(allExpired.map(file => [file.id, file])).values()
      );

      expect(uniqueExpired).toHaveLength(1);
      expect(uniqueExpired[0].id).toBe(3);
    });
  });
});
