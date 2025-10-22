export const ROLE_PERMISSIONS = {
  admin: ['users.manage', 'status.read', 'analytics.read'],
  manager: ['status.read'],
  service: ['status.read', 'analytics.read'],
  user: ['status.read']
}

export const permissionsFromRoles = (roles = []) => {
  const set = new Set()
  roles.forEach(role => {
    const perms = ROLE_PERMISSIONS[role] || []
    perms.forEach(perm => set.add(perm))
  })
  return Array.from(set).sort()
}

export default {
  ROLE_PERMISSIONS,
  permissionsFromRoles
}
