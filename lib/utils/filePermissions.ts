import type { File as FileEntity, Folder, User } from '@/types';

export function isDosenTendikRoleName(name?: string | null): boolean {
  const n = (name ?? '').toLowerCase();
  return n.includes('dosen') || n.includes('tendik');
}

export function canModifyFile(args: {
  file: Pick<
    FileEntity,
    | 'owner_id'
    | 'uploaded_by_role'
    | 'uploaded_by_role_id'
    | 'folder_owner_id'
  >;
  folder?: { owner_id?: string | null; role_id?: string | null } | null;
  user: Pick<User, 'id'> | null;
  activeRoleId: string | null;
  isAdmin: boolean;
}): boolean {
  if (args.isAdmin) return true;
  if (!args.user?.id) return false;

  const folderOwnerId =
    args.folder?.owner_id ?? args.file.folder_owner_id ?? null;
  const folderRoleId = args.folder?.role_id ?? null;
  // Folder-owner shortcut only applies when the active role matches the folder's role context.
  // Prevents multi-role users from getting modify rights via a folder they own under a different role.
  const activeRoleMatchesFolderRole =
    !folderRoleId || !args.activeRoleId || folderRoleId === args.activeRoleId;
  if (folderOwnerId && folderOwnerId === args.user.id && activeRoleMatchesFolderRole) return true;

  // Beyond folder-owner/admin, visibility is role-scoped: viewer's *active* role
  // must match the role the file was uploaded under. Same user with a different
  // active role does NOT bypass this.
  if (!args.activeRoleId || !args.file.uploaded_by_role_id) return false;
  if (args.file.uploaded_by_role_id !== args.activeRoleId) return false;

  // Role matches. For Dosen/Tendik uploads, also require the viewer to be the
  // actual uploader user (user-scoped exception).
  if (isDosenTendikRoleName(args.file.uploaded_by_role)) {
    return !!args.file.owner_id && args.file.owner_id === args.user.id;
  }
  return true;
}
