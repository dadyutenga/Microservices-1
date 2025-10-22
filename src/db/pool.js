import pg from 'pg'
import config from '../config/index.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
})

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err)
})

export const getClient = async () => pool.connect()

export default pool
