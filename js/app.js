// === КОНФИГУРАЦИЯ ===
const API_URL = 'https://kartajelani-production.up.railway.app'

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function showError(message) {
  alert('❌ ' + message)
}

function showSuccess(message) {
  alert('✅ ' + message)
}

// === РЕГИСТРАЦИЯ ===
async function registerUser(name, email, login, password, avatar) {
  try {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, login, password, avatar }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ошибка регистрации')
    return data
  } catch (error) {
    showError(error.message)
    return null
  }
}

// === ВХОД ===
async function loginUser(login, password) {
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ошибка входа')
    return data
  } catch (error) {
    showError(error.message)
    return null
  }
}

// === ПОЛУЧИТЬ ВСЕ ЦЕЛИ ПОЛЬЗОВАТЕЛЯ ===
async function getGoals(userId) {
  try {
    const response = await fetch(`${API_URL}/api/goals/${userId}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ошибка получения целей')
    return data
  } catch (error) {
    showError(error.message)
    return []
  }
}

// === СОЗДАТЬ ЦЕЛЬ ===
async function createGoal(
  userId,
  title,
  description,
  category,
  date,
  priority,
  progress,
  image,
  targetAmount,
  savedAmount,
) {
  try {
    const response = await fetch(`${API_URL}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        description,
        category,
        date,
        priority,
        progress,
        image,
        targetAmount,
        savedAmount,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ошибка создания цели')
    return data
  } catch (error) {
    showError(error.message)
    return null
  }
}

// === ОБНОВИТЬ ЦЕЛЬ ===
async function updateGoal(
  goalId,
  title,
  description,
  category,
  date,
  priority,
  progress,
  image,
  targetAmount,
  savedAmount,
) {
  try {
    const response = await fetch(`${API_URL}/api/goals/${goalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        date,
        priority,
        progress,
        image,
        targetAmount,
        savedAmount,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ошибка обновления цели')
    return data
  } catch (error) {
    showError(error.message)
    return null
  }
}

// === УДАЛИТЬ ЦЕЛЬ ===
async function deleteGoal(goalId) {
  try {
    const response = await fetch(`${API_URL}/api/goals/${goalId}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ошибка удаления цели')
    return data
  } catch (error) {
    showError(error.message)
    return null
  }
}

// === ЗАГРУЗКА ИЗОБРАЖЕНИЯ ===
async function uploadImage(file) {
  try {
    const formData = new FormData()
    formData.append('image', file)
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Ошибка загрузки изображения')
    return data.url
  } catch (error) {
    showError(error.message)
    return null
  }
}
