import createError from 'http-errors'
import { v4 as uuid } from 'uuid'
import pool from '../db/pool.js'

const BASE_ROLES = ['admin', 'manager', 'user', 'service']

const getQueryable = (client) => client || pool

export const ensureBaseRoles = async () => {
  await Promise.all(
    BASE_ROLES.map(async (role) => {
      await pool.query('INSERT INTO roles (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [uuid(), role])
    })
  )
}

export const getRolesForUser = async (userId, client) => {
  const executor = getQueryable(client)
  const { rows } = await executor.query(
    `SELECT r.name FROM roles r
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1
     ORDER BY r.name ASC`,
    [userId]
  )
  return rows.map(row => row.name)
}

export const assignRole = async ({ userId, role }, client) => {
  const executor = getQueryable(client)
  const { rows: userRows } = await executor.query('SELECT id FROM users WHERE id = $1', [userId])
  if (userRows.length === 0) {
    throw createError(404, 'User not found', { code: 'USER_NOT_FOUND' })
  }
  const { rows: roleRows } = await executor.query('SELECT id FROM roles WHERE name = $1', [role])
  if (roleRows.length === 0) {
    throw createError(404, 'Role not found', { code: 'ROLE_NOT_FOUND' })
  }
  const roleId = roleRows[0].id
  await executor.query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, roleId]
  )
  return true
}

export const getAllRoles = async () => {
  const { rows } = await pool.query('SELECT name FROM roles ORDER BY name ASC')
  return rows.map(row => row.name)
}

export default {
  ensureBaseRoles,
  getRolesForUser,
  assignRole,
  getAllRoles
}
