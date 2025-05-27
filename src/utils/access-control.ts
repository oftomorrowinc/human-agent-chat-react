import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { AccessLevel, Member, memberSchema } from '../types';

/**
 * Hierarchical Access Control System for Firebase
 *
 * This system implements a consistent pattern of members collections
 * at any level in a path hierarchy to control access.
 */
export class AccessControl {
  private static db = getDb();

  /**
   * Check if a user has sufficient access to a specific path
   * Checks access at each level of the hierarchy from root to target
   */
  static async hasAccess(
    path: string,
    userId: string,
    requiredLevel: AccessLevel
  ): Promise<boolean> {
    try {
      console.log(
        `🔐 Checking access for user ${userId} at path ${path} with level ${requiredLevel}`
      );

      // Split path into segments for hierarchical checking
      const segments = path.split('/').filter(Boolean);

      // Check access at each level of the hierarchy
      for (let i = 0; i < segments.length; i += 2) {
        const currentPath = segments.slice(0, i + 2).join('/');
        const membersPath = `${currentPath}/members`;

        console.log(`  🔍 Checking members at: ${membersPath}`);

        // Query for user's membership at this level
        const membersRef = collection(this.db, membersPath);
        const memberQuery = query(membersRef, where('userId', '==', userId));
        const memberSnapshot = await getDocs(memberQuery);

        if (!memberSnapshot.empty) {
          const memberDoc = memberSnapshot.docs[0];
          const memberData = memberDoc.data() as Member;

          console.log(
            `  ✅ Found membership: ${memberData.level} at ${currentPath}`
          );

          // Check if the user's level meets the requirement
          if (this.hasRequiredLevel(memberData.level, requiredLevel)) {
            console.log(
              `  🎯 Access granted: ${memberData.level} >= ${requiredLevel}`
            );
            return true;
          }
        } else {
          console.log(`  ❌ No membership found at ${currentPath}`);
        }
      }

      // If no members collection exists at any level, check if it's public
      // (This would be a business logic decision - for now we deny access)
      console.log(`  🚫 Access denied: No sufficient membership found`);
      return false;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  /**
   * Add a member to a specific path with given access level
   */
  static async addMember(
    path: string,
    userId: string,
    level: AccessLevel,
    addedBy?: string
  ): Promise<void> {
    try {
      const membersPath = `${path}/members`;
      const memberDocId = `member_${userId}`;
      const memberRef = doc(this.db, membersPath, memberDocId);

      const memberData: Member = {
        userId,
        level,
        addedBy,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(memberRef, memberData);
      console.log(`✅ Added member ${userId} with ${level} access to ${path}`);
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  /**
   * Update a member's access level
   */
  static async updateMember(
    path: string,
    userId: string,
    level: AccessLevel
  ): Promise<void> {
    try {
      const membersPath = `${path}/members`;
      const memberDocId = `member_${userId}`;
      const memberRef = doc(this.db, membersPath, memberDocId);

      // Check if member exists
      const memberDoc = await getDoc(memberRef);
      if (!memberDoc.exists()) {
        throw new Error(`Member ${userId} not found at ${path}`);
      }

      const existingData = memberDoc.data() as Member;
      const updatedData: Member = {
        ...existingData,
        level,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(memberRef, updatedData);
      console.log(`✅ Updated member ${userId} to ${level} access at ${path}`);
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  /**
   * Remove a member from a specific path
   */
  static async removeMember(path: string, userId: string): Promise<void> {
    try {
      const membersPath = `${path}/members`;
      const memberDocId = `member_${userId}`;
      const memberRef = doc(this.db, membersPath, memberDocId);

      await deleteDoc(memberRef);
      console.log(`✅ Removed member ${userId} from ${path}`);
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Get all members with access to a specific path
   */
  static async getMembers(path: string): Promise<Member[]> {
    try {
      const membersPath = `${path}/members`;
      const membersRef = collection(this.db, membersPath);
      const snapshot = await getDocs(membersRef);

      const members: Member[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const validationResult = memberSchema.safeParse(data);
        if (validationResult.success) {
          members.push(validationResult.data);
        } else {
          console.warn('Invalid member data:', data, validationResult.error);
        }
      });

      console.log(`📋 Found ${members.length} members at ${path}`);
      return members;
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  /**
   * Initialize a new chat with an admin user
   */
  static async initializeChat(
    path: string,
    adminUserId: string
  ): Promise<void> {
    try {
      // Create the chat document
      const chatRef = doc(this.db, path);
      await setDoc(chatRef, {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: adminUserId,
      });

      // Add admin as a member
      await this.addMember(path, adminUserId, AccessLevel.ADMIN, adminUserId);

      console.log(`🆕 Initialized chat at ${path} with admin ${adminUserId}`);
    } catch (error) {
      console.error('Error initializing chat:', error);
      throw error;
    }
  }

  /**
   * Grant organization-wide access to a chat
   */
  static async grantOrgAccess(
    orgPath: string,
    chatPath: string,
    adminUserId: string
  ): Promise<void> {
    try {
      // Get all organization members
      const orgMembers = await this.getMembers(orgPath);

      // Add each org member to the chat with READ access by default
      const batch = writeBatch(this.db);

      for (const member of orgMembers) {
        const membersPath = `${chatPath}/members`;
        const memberDocId = `member_${member.userId}`;
        const memberRef = doc(this.db, membersPath, memberDocId);

        const memberData: Member = {
          userId: member.userId,
          level: AccessLevel.READ, // Default to read access
          addedBy: adminUserId,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        batch.set(memberRef, memberData);
      }

      await batch.commit();
      console.log(
        `🏢 Granted org access from ${orgPath} to ${chatPath} for ${orgMembers.length} members`
      );
    } catch (error) {
      console.error('Error granting org access:', error);
      throw error;
    }
  }

  /**
   * Check if a user's access level meets the required level
   */
  private static hasRequiredLevel(
    userLevel: AccessLevel,
    requiredLevel: AccessLevel
  ): boolean {
    const levelHierarchy = {
      [AccessLevel.READ]: 1,
      [AccessLevel.WRITE]: 2,
      [AccessLevel.ADMIN]: 3,
    };

    return levelHierarchy[userLevel] >= levelHierarchy[requiredLevel];
  }

  /**
   * Get the effective access level for a user at a specific path
   */
  static async getUserAccessLevel(
    path: string,
    userId: string
  ): Promise<AccessLevel | null> {
    try {
      const segments = path.split('/').filter(Boolean);
      let highestLevel: AccessLevel | null = null;

      // Check access at each level and keep the highest level found
      for (let i = 0; i < segments.length; i += 2) {
        const currentPath = segments.slice(0, i + 2).join('/');
        const membersPath = `${currentPath}/members`;

        const membersRef = collection(this.db, membersPath);
        const memberQuery = query(membersRef, where('userId', '==', userId));
        const memberSnapshot = await getDocs(memberQuery);

        if (!memberSnapshot.empty) {
          const memberDoc = memberSnapshot.docs[0];
          const memberData = memberDoc.data() as Member;

          if (
            !highestLevel ||
            this.hasRequiredLevel(memberData.level, highestLevel)
          ) {
            highestLevel = memberData.level;
          }
        }
      }

      return highestLevel;
    } catch (error) {
      console.error('Error getting user access level:', error);
      return null;
    }
  }

  /**
   * Check if a path exists and is accessible
   */
  static async pathExists(path: string): Promise<boolean> {
    try {
      const docRef = doc(this.db, path);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking path existence:', error);
      return false;
    }
  }

  /**
   * Create a public chat (no access control)
   */
  static async createPublicChat(
    path: string,
    creatorId: string
  ): Promise<void> {
    try {
      const chatRef = doc(this.db, path);
      await setDoc(chatRef, {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: creatorId,
        isPublic: true,
      });

      console.log(`🌍 Created public chat at ${path}`);
    } catch (error) {
      console.error('Error creating public chat:', error);
      throw error;
    }
  }
}
