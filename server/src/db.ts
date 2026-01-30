import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',     // <-- EDIT THIS
  password: 'ramsunny@28', // <-- EDIT THIS
  database: 'harms_db',            // <-- EDIT THIS
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;