import { AccessControl } from '../../src/utils/access-control';
import * as firebase from '../../src/lib/firebase';
import { AccessLevel } from '../../src/types';

// Mock firebase module
jest.mock('../../src/lib/firebase', () => ({
  getMembers: jest.fn(),
  addMember: jest.fn(),
  updateMemberAccess: jest.fn(),
  removeMember: jest.fn(),
  checkAccess: jest.fn(),
}));

describe('AccessControl', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getMembers', () => {
    test('should call firebase.getMembers with the correct path', async () => {
      const mockMembers = [{ userId: 'user1', level: AccessLevel.READ }];
      (firebase.getMembers as jest.Mock).mockResolvedValueOnce(mockMembers);

      const result = await AccessControl.getMembers('chats/test-chat');

      expect(firebase.getMembers).toHaveBeenCalledWith('chats/test-chat');
      expect(result).toEqual(mockMembers);
    });
  });

  describe('addMember', () => {
    test('should call firebase.addMember with the correct parameters', async () => {
      await AccessControl.addMember(
        'chats/test-chat',
        'user1',
        AccessLevel.READ,
        'admin1'
      );

      expect(firebase.addMember).toHaveBeenCalledWith('chats/test-chat', {
        userId: 'user1',
        level: AccessLevel.READ,
        addedBy: 'admin1',
        addedAt: expect.any(Number),
      });
    });

    test('should work without the optional addedBy parameter', async () => {
      await AccessControl.addMember(
        'chats/test-chat',
        'user1',
        AccessLevel.READ
      );

      expect(firebase.addMember).toHaveBeenCalledWith('chats/test-chat', {
        userId: 'user1',
        level: AccessLevel.READ,
        addedAt: expect.any(Number),
      });
    });
  });

  describe('updateMember', () => {
    test('should call firebase.updateMemberAccess with the correct parameters', async () => {
      await AccessControl.updateMember(
        'chats/test-chat',
        'user1',
        AccessLevel.WRITE
      );

      expect(firebase.updateMemberAccess).toHaveBeenCalledWith(
        'chats/test-chat',
        'user1',
        AccessLevel.WRITE
      );
    });
  });

  describe('removeMember', () => {
    test('should call firebase.removeMember with the correct parameters', async () => {
      await AccessControl.removeMember('chats/test-chat', 'user1');

      expect(firebase.removeMember).toHaveBeenCalledWith(
        'chats/test-chat',
        'user1'
      );
    });
  });

  describe('hasAccess', () => {
    test('should call firebase.checkAccess with the correct parameters', async () => {
      (firebase.checkAccess as jest.Mock).mockResolvedValueOnce(true);

      const result = await AccessControl.hasAccess(
        'chats/test-chat',
        'user1',
        AccessLevel.READ
      );

      expect(firebase.checkAccess).toHaveBeenCalledWith(
        'chats/test-chat',
        'user1',
        AccessLevel.READ
      );
      expect(result).toBe(true);
    });

    test('should return false when user does not have access', async () => {
      (firebase.checkAccess as jest.Mock).mockResolvedValueOnce(false);

      const result = await AccessControl.hasAccess(
        'chats/test-chat',
        'user1',
        AccessLevel.ADMIN
      );

      expect(result).toBe(false);
    });
  });

  describe('initializeChat', () => {
    test('should add the admin member with admin access', async () => {
      await AccessControl.initializeChat('chats/new-chat', 'admin1');

      expect(firebase.addMember).toHaveBeenCalledWith('chats/new-chat', {
        userId: 'admin1',
        level: AccessLevel.ADMIN,
        addedBy: 'admin1',
        addedAt: expect.any(Number),
      });
    });
  });

  describe('grantOrgAccess', () => {
    test('should get org members and grant them read access to the chat', async () => {
      const orgMembers = [
        { userId: 'user1', level: AccessLevel.READ },
        { userId: 'user2', level: AccessLevel.WRITE },
      ];
      (firebase.getMembers as jest.Mock).mockResolvedValueOnce(orgMembers);

      await AccessControl.grantOrgAccess(
        'orgs/test-org',
        'chats/org-chat',
        'admin1'
      );

      // Should get org members
      expect(firebase.getMembers).toHaveBeenCalledWith('orgs/test-org');

      // Should grant each member read access to the chat
      expect(firebase.addMember).toHaveBeenCalledTimes(2);
      expect(firebase.addMember).toHaveBeenCalledWith('chats/org-chat', {
        userId: 'user1',
        level: AccessLevel.READ,
        addedBy: 'admin1',
        addedAt: expect.any(Number),
      });
      expect(firebase.addMember).toHaveBeenCalledWith('chats/org-chat', {
        userId: 'user2',
        level: AccessLevel.READ,
        addedBy: 'admin1',
        addedAt: expect.any(Number),
      });
    });
  });
});