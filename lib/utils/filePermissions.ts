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
  folder?: Pick<Folder, 'owner_id'> | { owner_id?: string | null } | null;
  user: Pick<User, 'id'> | null;
  activeRoleId: string | null;
  isAdmin: boolean;
}): boolean {
  if (args.isAdmin) return true;
  if (!args.user?.id) return false;

  const folderOwnerId =
    args.folder?.owner_id ?? args.file.folder_owner_id ?? null;
  if (folderOwnerId && folderOwnerId === args.user.id) return true;

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
