import roleService from '../services/roleService.js'
import { roleAssignSchema, roleUserParamsSchema } from '../utils/validators.js'

export const assignRole = async (req, res, next) => {
  try {
    const payload = roleAssignSchema.parse(req.body)
    await roleService.assignRole(payload)
    const roles = await roleService.getRolesForUser(payload.userId)
    res.status(200).json({ userId: payload.userId, roles })
  } catch (err) {
    next(err)
  }
}

export const getUserRoles = async (req, res, next) => {
  try {
    const params = roleUserParamsSchema.parse(req.params)
    const roles = await roleService.getRolesForUser(params.id)
    res.json({ userId: params.id, roles })
  } catch (err) {
    next(err)
  }
}

export const listRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getAllRoles()
    res.json({ roles })
  } catch (err) {
    next(err)
  }
}

export default {
  assignRole,
  getUserRoles,
  listRoles
}
