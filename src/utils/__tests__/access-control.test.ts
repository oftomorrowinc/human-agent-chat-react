import { AccessControl } from '../access-control';
import { AccessLevel } from '../../types';

// Mock Firebase Firestore
const mockDoc = jest.fn(() => ({}));
const mockDocumentData = { exists: jest.fn(), data: jest.fn() };

// Mock the firebase/firestore module first
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  FieldValue: {
    delete: jest.fn(() => ({ type: 'delete' }))
  }
}));

// Then mock the local firebase module
jest.mock('../../lib/firebase', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(() => ({})),
    doc: jest.fn(() => ({}))
  }))
}));

describe('AccessControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup firebase/firestore mocks
    const { getDoc } = require('firebase/firestore');
    getDoc.mockResolvedValue(mockDocumentData);
    mockDocumentData.exists.mockReturnValue(true);
  });

  describe('hasAccess', () => {
    it('should grant access when user has required level', async () => {
      mockDocumentData.data.mockReturnValue({
        'user123': { level: 'admin' }
      });

      const hasAccess = await AccessControl.hasAccess('path/to/resource', 'user123', AccessLevel.WRITE);
      expect(hasAccess).toBe(true);
    });

    it('should deny access when user has insufficient level', async () => {
      mockDocumentData.data.mockReturnValue({
        'user123': { level: 'read' }
      });

      const hasAccess = await AccessControl.hasAccess('path/to/resource', 'user123', AccessLevel.WRITE);
      expect(hasAccess).toBe(false);
    });

    it('should deny access when user not found', async () => {
      mockDocumentData.data.mockReturnValue({});

      const hasAccess = await AccessControl.hasAccess('path/to/resource', 'user123', AccessLevel.READ);
      expect(hasAccess).toBe(false);
    });

    it('should handle Firebase errors gracefully', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockRejectedValue(new Error('Firebase error'));

      const hasAccess = await AccessControl.hasAccess('path/to/resource', 'user123', AccessLevel.READ);
      expect(hasAccess).toBe(false);
    });
  });

  describe('getUserAccessLevel', () => {
    it('should return user access level from document', async () => {
      mockDocumentData.data.mockReturnValue({
        'user123': { level: 'admin' }
      });

      const level = await AccessControl.getUserAccessLevel('path/to/resource', 'user123');
      expect(level).toBe(AccessLevel.ADMIN);
    });

    it('should return null when user not found', async () => {
      mockDocumentData.data.mockReturnValue({});

      const level = await AccessControl.getUserAccessLevel('path/to/resource', 'user123');
      expect(level).toBeNull();
    });

    it('should return null when document does not exist', async () => {
      mockDocumentData.exists.mockReturnValue(false);

      const level = await AccessControl.getUserAccessLevel('path/to/resource', 'user123');
      expect(level).toBeNull();
    });
  });

  describe('pathExists', () => {
    it('should return true when path exists', async () => {
      mockDocumentData.exists.mockReturnValue(true);

      const exists = await AccessControl.pathExists('path/to/resource');
      expect(exists).toBe(true);
    });

    it('should return false when path does not exist', async () => {
      mockDocumentData.exists.mockReturnValue(false);

      const exists = await AccessControl.pathExists('path/to/resource');
      expect(exists).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockRejectedValue(new Error('Firebase error'));

      const exists = await AccessControl.pathExists('path/to/resource');
      expect(exists).toBe(false);
    });
  });

  describe('addMember', () => {
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();

    beforeEach(() => {
      mockDoc.mockReturnValue({
        set: mockSet,
        update: mockUpdate
      });
    });

    it('should add member with specified level', async () => {
      mockDocumentData.exists.mockReturnValue(false);

      await AccessControl.addMember('path/to/resource', 'user123', AccessLevel.WRITE);

      expect(mockSet).toHaveBeenCalledWith({
        'user123': {
          level: 'write',
          addedAt: expect.any(String),
          addedBy: 'system'
        }
      });
    });
  });

  describe('getMembers', () => {
    it('should return list of members', async () => {
      mockDocumentData.data.mockReturnValue({
        'user1': { level: 'read', addedAt: '2024-01-01' },
        'user2': { level: 'admin', addedAt: '2024-01-02' }
      });

      const members = await AccessControl.getMembers('path/to/resource');

      expect(members).toEqual([
        { userId: 'user1', level: AccessLevel.READ, addedAt: '2024-01-01' },
        { userId: 'user2', level: AccessLevel.ADMIN, addedAt: '2024-01-02' }
      ]);
    });

    it('should return empty array when no members', async () => {
      mockDocumentData.data.mockReturnValue({});

      const members = await AccessControl.getMembers('path/to/resource');
      expect(members).toEqual([]);
    });

    it('should handle missing document', async () => {
      mockDocumentData.exists.mockReturnValue(false);

      const members = await AccessControl.getMembers('path/to/resource');
      expect(members).toEqual([]);
    });
  });
});