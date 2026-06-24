console.log('🚀 СЕРВЕР ПЫТАЕТСЯ ЗАПУСТИТЬСЯ')

const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

console.log('📦 ПЕРЕМЕННЫЕ БД:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
})

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// ============================================
// НАСТРОЙКА
// ============================================

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(express.static(path.join(__dirname)))
app.use('/uploads', express.static(uploadDir))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

// Настройка multer
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, unique + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|gif/
    const ext = types.test(path.extname(file.originalname).toLowerCase())
    const mime = types.test(file.mimetype)
    if (ext && mime) cb(null, true)
    else cb(new Error('Только изображения (jpg, png, gif)'))
  },
})

// ============================================
// ПОДКЛЮЧЕНИЕ К MYSQL
// ============================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wishlist',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// ============================================
// СОЗДАНИЕ ТАБЛИЦ
// ============================================

async function createTables() {
  try {
    const connection = await pool.getConnection()

    await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                login VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                avatar LONGTEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `)

    await connection.query(`
            CREATE TABLE IF NOT EXISTS goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                date DATE,
                priority VARCHAR(20),
                progress INT DEFAULT 0,
                image LONGTEXT,
                target_amount INT,
                saved_amount INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `)

    connection.release()
    console.log('✅ Таблицы созданы/проверены')
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error.message)
    process.exit(1)
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

async function runQuery(sql, params = []) {
  const [result] = await pool.query(sql, params)
  return result
}

async function getQuery(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows[0]
}

async function allQuery(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows
}

// ============================================
// API РОУТЫ
// ============================================

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, login, password, avatar } = req.body

    if (!name || !email || !login || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль минимум 6 символов' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await runQuery('INSERT INTO users (name, email, login, password, avatar) VALUES (?, ?, ?, ?, ?)', [
      name,
      email,
      login,
      hashedPassword,
      avatar || null,
    ])

    const token = jwt.sign({ id: result.insertId, login }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: {
        id: result.insertId,
        name,
        email,
        login,
        avatar: avatar || null,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email или логин уже заняты' })
    }
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body

    if (!login || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' })
    }

    const user = await getQuery('SELECT * FROM users WHERE login = ? OR email = ?', [login, login])

    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        login: user.login,
        avatar: user.avatar,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await getQuery('SELECT id, name, email, login, avatar, created_at FROM users WHERE id = ?', [
      req.params.id,
    ])
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await allQuery('SELECT id, name, email, login, avatar, created_at FROM users')
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email, login, avatar } = req.body
    const userId = req.params.id

    if (!name || !email || !login) {
      return res.status(400).json({ error: 'Все поля обязательны' })
    }

    const result = await runQuery('UPDATE users SET name = ?, email = ?, login = ?, avatar = ? WHERE id = ?', [
      name,
      email,
      login,
      avatar || null,
      userId,
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }

    res.json({ success: true })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email или логин уже заняты' })
    }
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/goals/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    console.log('📥 Запрос целей для пользователя ID:', userId)

    const goals = await allQuery(
      `SELECT * FROM goals WHERE user_id = ? 
             ORDER BY 
                CASE priority 
                    WHEN 'high' THEN 0 
                    WHEN 'medium' THEN 1 
                    WHEN 'low' THEN 2 
                END, 
                date ASC`,
      [userId],
    )
    console.log('📦 Найдено целей:', goals.length)
    res.json(goals)
  } catch (error) {
    console.error('❌ Ошибка получения целей:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/goals', async (req, res) => {
  try {
    const { userId, title, description, category, date, priority, progress, image, targetAmount, savedAmount } =
      req.body

    console.log('📥 Получен запрос на создание цели:', req.body)

    if (!title || !date) {
      console.log('❌ Ошибка: нет названия или даты')
      return res.status(400).json({ error: 'Название и дата обязательны' })
    }

    if (!userId) {
      console.log('❌ Ошибка: нет userId')
      return res.status(400).json({ error: 'userId обязателен' })
    }

    const result = await runQuery(
      `INSERT INTO goals 
             (user_id, title, description, category, date, priority, progress, image, target_amount, saved_amount) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        description || null,
        category || 'other',
        date,
        priority || 'medium',
        progress || 0,
        image || null,
        targetAmount || null,
        savedAmount || 0,
      ],
    )

    console.log('✅ Цель создана с ID:', result.insertId)

    const newGoal = await getQuery('SELECT * FROM goals WHERE id = ?', [result.insertId])
    console.log('📦 Возвращаем цель:', newGoal)

    res.status(201).json(newGoal)
  } catch (error) {
    console.error('❌ Ошибка создания цели:', error)
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/goals/:id', async (req, res) => {
  try {
    const { title, description, category, date, priority, progress, image, targetAmount, savedAmount } = req.body
    const goalId = req.params.id

    console.log('📥 Обновление цели ID:', goalId)

    const result = await runQuery(
      `UPDATE goals SET 
                title = ?, description = ?, category = ?, date = ?, 
                priority = ?, progress = ?, image = ?, 
                target_amount = ?, saved_amount = ?
             WHERE id = ?`,
      [
        title,
        description || null,
        category || 'other',
        date,
        priority || 'medium',
        progress || 0,
        image || null,
        targetAmount || null,
        savedAmount || 0,
        goalId,
      ],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Цель не найдена' })
    }

    const updatedGoal = await getQuery('SELECT * FROM goals WHERE id = ?', [goalId])
    res.json(updatedGoal)
  } catch (error) {
    console.error('❌ Ошибка обновления цели:', error)
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/goals/:id', async (req, res) => {
  try {
    const goalId = req.params.id
    console.log('📥 Удаление цели ID:', goalId)

    const result = await runQuery('DELETE FROM goals WHERE id = ?', [goalId])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Цель не найдена' })
    }
    res.json({ success: true })
  } catch (error) {
    console.error('❌ Ошибка удаления цели:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' })
  }
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  res.json({ url })
})

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

async function startServer() {
  try {
    console.log('⏳ ПРОВЕРКА ПОДКЛЮЧЕНИЯ К MYSQL...')
    const connection = await pool.getConnection()
    console.log('✅ Подключено к MySQL')
    connection.release()

    await createTables()

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`)
      console.log(`✅ API доступен: http://localhost:${PORT}/api`)
      console.log(`📁 Загрузки: http://localhost:${PORT}/uploads`)
    })
  } catch (error) {
    console.error('❌ Ошибка подключения к MySQL:', error.message)
    console.log('\n🔧 ПРОВЕРЬТЕ:')
    console.log('1. Запущен ли MySQL сервер?')
    console.log('2. Правильный ли пароль в файле .env?')
    console.log('3. Существует ли база данных wishlist?')
    process.exit(1)
  }
}

startServer()
