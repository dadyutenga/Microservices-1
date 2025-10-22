import { Router } from 'express'
import * as rolesController from '../controllers/roles.controller.js'
import authMiddleware, { requireRoles } from '../middlewares/auth.js'

const router = Router()

router.get('/', authMiddleware(true), requireRoles(['admin']), rolesController.listRoles)
router.post('/assign', authMiddleware(true), requireRoles(['admin']), rolesController.assignRole)
router.get('/user/:id', authMiddleware(true), requireRoles(['admin', 'manager']), rolesController.getUserRoles)

export default router
