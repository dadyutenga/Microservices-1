import { Router } from 'express'
import * as recoveryController from '../controllers/recovery.controller.js'

const router = Router()

router.post('/request', recoveryController.requestRecovery)
router.post('/confirm', recoveryController.confirmRecovery)

export default router
