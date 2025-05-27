# Hierarchical Access Control

One of the core strengths of HumanAgentChat is its elegant and flexible access control system. This document explains how the hierarchical access control works and provides examples of common usage patterns.

## Core Concept

The access control system uses a consistent pattern of `members` collections at any level in a path hierarchy. This makes it highly adaptable for various use cases from organization-wide communication to small group collaborations.

## Access Levels

HumanAgentChat defines three access levels:

- **READ**: Users can view messages but cannot send messages
- **WRITE**: Users can view and send messages
- **ADMIN**: Users can view, send messages, and manage members

## Hierarchical Structure

Access permissions are hierarchical, following the Firebase path structure. A user's access at a higher level in the hierarchy can grant them access to lower levels, but restrictions at a specific level override permissions from higher levels.

### Example Structure

```
organizations/
  org-id/                  # Organization level
    members/               # Organization members
      member-doc-1: { userId, level, addedBy, addedAt }
    
    channels/              
      channel-id/          # Channel level
        members/           # Channel members
          member-doc-1: { userId, level, addedBy, addedAt }
        
        messages/          # Channel messages
          message-id-1: { ... }
    
    departments/
      department-id/       # Department level
        members/           # Department members
          member-doc-1: { userId, level, addedBy, addedAt }
        
        messages/          # Department messages
          message-id-1: { ... }
        
        projects/
          project-id/      # Project level
            members/       # Project members
              member-doc-1: { userId, level, addedBy, addedAt }
            
            messages/      # Project messages
              message-id-1: { ... }
```

## Access Checking Algorithm

When checking if a user has access to a specific path, the system:

1. Splits the path into segments
2. Checks access at each level of the hierarchy, starting from the root
3. Returns `true` if the user has sufficient access at any level
4. Returns `false` if no access is found

## Common Usage Patterns

### Organization-wide Access

Grant a user access to an entire organization:

```javascript
await AccessControl.addMember('organizations/org-id', 'user-id', 'read', 'admin-id');
```

This gives the user read access to the organization and all its channels, departments, etc., unless overridden at a lower level.

### Limited Department Access

Restrict a user to a specific department:

```javascript
// No organization-level access
// Grant department-level access
await AccessControl.addMember('organizations/org-id/departments/dept-id', 'user-id', 'write', 'admin-id');
```

This gives the user write access to only this department and its projects.

### Project-specific Access

Grant a user access to only a specific project:

```javascript
await AccessControl.addMember(
  'organizations/org-id/departments/dept-id/projects/project-id', 
  'user-id', 
  'write', 
  'admin-id'
);
```

This gives the user write access to only this specific project.

### Mixed Access Levels

A user can have different access levels at different points in the hierarchy:

```javascript
// Read access to the organization
await AccessControl.addMember('organizations/org-id', 'user-id', 'read', 'admin-id');

// Write access to a specific channel
await AccessControl.addMember('organizations/org-id/channels/channel-id', 'user-id', 'write', 'admin-id');

// Admin access to a specific project
await AccessControl.addMember(
  'organizations/org-id/departments/dept-id/projects/project-id', 
  'user-id', 
  'admin', 
  'admin-id'
);
```

## Checking Access Programmatically

You can check if a user has sufficient access to a specific path:

```javascript
const canRead = await AccessControl.hasAccess(
  'organizations/org-id/channels/channel-id',
  'user-id',
  'read'
);

const canWrite = await AccessControl.hasAccess(
  'organizations/org-id/channels/channel-id',
  'user-id',
  'write'
);

const isAdmin = await AccessControl.hasAccess(
  'organizations/org-id/channels/channel-id',
  'user-id',
  'admin'
);
```

## Implementation in the UI

The ChatUI component automatically checks access when initialized:

1. If the user has no access (not even read), an "Access Denied" message is shown
2. If the user has read-only access, the chat is displayed without an input field
3. If the user has write or admin access, the full chat with input is displayed

## Security Rules

For proper security, you should implement Firebase Security Rules that enforce these access controls. Here's an example:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Function to check if user is a member with sufficient access
    function hasMemberAccess(path, level) {
      let requiredLevel = level == 'read' ? 0 : (level == 'write' ? 1 : 2);
      let userLevel = -1;
      
      // Check each segment of the path
      let segments = path.split('/');
      for (let i = 0; i < segments.length; i += 2) {
        let subpath = segments.slice(0, i + 2).join('/');
        let memberPath = subpath + '/members';
        
        // Look for user's membership document
        let memberDocs = get(/databases/$(database)/documents/$(memberPath)
          .where('userId', '==', request.auth.uid)).documents;
        
        if (memberDocs.size() > 0) {
          let memberLevel = memberDocs[0].data.level == 'read' ? 0 : 
                          (memberDocs[0].data.level == 'write' ? 1 : 2);
          userLevel = max(userLevel, memberLevel);
        }
      }
      
      return userLevel >= requiredLevel;
    }
    
    // Messages rules
    match /{path=**}/messages/{messageId} {
      allow read: if hasMemberAccess(path, 'read');
      allow create: if hasMemberAccess(path, 'write') && 
                     request.resource.data.senderId == request.auth.uid;
      allow update, delete: if hasMemberAccess(path, 'admin') || 
                             (hasMemberAccess(path, 'write') && 
                              resource.data.senderId == request.auth.uid);
    }
    
    // Members rules
    match /{path=**}/members/{memberId} {
      allow read: if hasMemberAccess(path, 'read');
      allow create, update, delete: if hasMemberAccess(path, 'admin');
    }
  }
}
```

## Benefits of This Approach

1. **Consistency**: The same access control pattern applies throughout the hierarchy
2. **Flexibility**: Access can be granted at any level in the hierarchy
3. **Inheritance**: Permissions flow down from higher levels unless overridden
4. **Simplicity**: Clear, understandable model that's easy to implement and extend
5. **Efficiency**: Minimal database operations needed to check access