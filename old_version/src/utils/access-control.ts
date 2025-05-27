import {
  getMembers,
  addMember,
  updateMemberAccess,
  removeMember,
  checkAccess,
} from '../lib/firebase.js';
import { AccessLevel, MemberAccess } from '../types/index.js';

/**
 * Access Control utility for hierarchical permissions management
 * This utility implements a flexible, hierarchical access control system
 * where permissions can be managed at any level in a path hierarchy.
 */
export class AccessControl {
  /**
   * Get all members with access to a specific path
   * @param path Path to check access for
   * @returns Promise resolving to array of member access records
   */
  static async getMembers(path: string): Promise<MemberAccess[]> {
    return getMembers(path);
  }

  /**
   * Add a new member with specified access level
   * @param path Path to add member to
   * @param userId User ID to add
   * @param level Access level to grant
   * @param addedBy ID of user adding the member
   * @returns Promise that resolves when member is added
   */
  static async addMember(
    path: string,
    userId: string,
    level: AccessLevel,
    addedBy?: string
  ): Promise<void> {
    const memberAccess: MemberAccess = {
      userId,
      level,
      addedBy,
      addedAt: Date.now(),
    };

    await addMember(path, memberAccess);
  }

  /**
   * Update a member's access level
   * @param path Path to update member at
   * @param userId User ID to update
   * @param level New access level
   * @returns Promise that resolves when member is updated
   */
  static async updateMember(
    path: string,
    userId: string,
    level: AccessLevel
  ): Promise<void> {
    await updateMemberAccess(path, userId, level);
  }

  /**
   * Remove a member's access
   * @param path Path to remove member from
   * @param userId User ID to remove
   * @returns Promise that resolves when member is removed
   */
  static async removeMember(path: string, userId: string): Promise<void> {
    await removeMember(path, userId);
  }

  /**
   * Check if user has sufficient access level for a path
   * Implements hierarchical access checking, where permissions are inherited
   * from parent paths in the hierarchy.
   * @param path Path to check access for
   * @param userId User ID to check
   * @param requiredLevel Required access level
   * @returns Promise resolving to boolean indicating if access is granted
   */
  static async hasAccess(
    path: string,
    userId: string,
    requiredLevel: AccessLevel
  ): Promise<boolean> {
    return checkAccess(path, userId, requiredLevel);
  }

  /**
   * Create a new chat with initial admin member
   * @param path Path to create chat at
   * @param adminUserId User ID of admin
   * @returns Promise that resolves when chat and admin member are created
   */
  static async initializeChat(
    path: string,
    adminUserId: string
  ): Promise<void> {
    // First add the admin member
    await this.addMember(path, adminUserId, AccessLevel.ADMIN, adminUserId);
  }

  /**
   * Grant read access to all users within an organization
   * @param orgPath Organization path
   * @param chatPath Chat path to grant access to
   * @param adminUserId User ID performing the action
   */
  static async grantOrgAccess(
    orgPath: string,
    chatPath: string,
    adminUserId: string
  ): Promise<void> {
    // Get all org members
    const members = await this.getMembers(orgPath);

    // Grant each member read access to the chat
    for (const member of members) {
      await this.addMember(
        chatPath,
        member.userId,
        AccessLevel.READ,
        adminUserId
      );
    }
  }
}
