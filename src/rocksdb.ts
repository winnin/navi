import rocksdb from 'level-rocksdb'

const dbPath = process.env.DB_PATH || 'db'

const db = rocksdb(dbPath)

export function getDb(){
  return db
}
