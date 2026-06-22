// ============================================
// КОНФИГУРАЦИЯ
// ============================================
const API_URL = 'http://localhost:3000/api'

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================
let goals = []
let currentUser = null
let editingGoalId = null
let goalImageData = null
let registerAvatarData = null
let profileAvatarData = null

// ============================================
// DOM ЭЛЕМЕНТЫ
// ============================================
const elements = {
  notification: document.getElementById('notification'),
  notificationIcon: document.getElementById('notification-icon'),
  notificationTitle: document.getElementById('notification-title'),
  notificationText: document.getElementById('notification-text'),

  userName: document.getElementById('user-name'),
  avatarText: document.getElementById('avatar-text'),
  avatarImg: document.getElementById('avatar-img'),
  logoutBtn: document.getElementById('logout-btn'),
  loginBtn: document.getElementById('login-btn'),
  authMessage: document.getElementById('auth-message'),
  profileLink: document.getElementById('profile-link'),

  goalsContainer: document.getElementById('goals-container'),
  emptyState: document.getElementById('empty-state'),
  goalForm: document.getElementById('goal-form'),

  footerTotalGoals: document.getElementById('footer-total-goals'),
  footerUpcomingGoals: document.getElementById('footer-upcoming-goals'),
  footerUsersCount: document.getElementById('footer-users-count'),
}

// ============================================
// УВЕДОМЛЕНИЯ
// ============================================
function showNotification(title, text, type = 'info') {
  elements.notificationTitle.textContent = title
  elements.notificationText.textContent = text
  const icon = elements.notificationIcon.querySelector('i')
  if (type === 'success') icon.className = 'fas fa-check-circle'
  else if (type === 'error') icon.className = 'fas fa-exclamation-circle'
  else icon.className = 'fas fa-info-circle'
  elements.notification.classList.add('show')
  setTimeout(() => elements.notification.classList.remove('show'), 5000)
}

// ============================================
// РАБОТА С API
// ============================================
async function apiRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options)
    const result = await response.json()
    return { ok: response.ok, data: result, status: response.status }
  } catch (error) {
    console.error('❌ API Error:', error)
    return { ok: false, data: { error: 'Ошибка соединения с сервером' } }
  }
}

// ============================================
// АВТОРИЗАЦИЯ
// ============================================
async function login() {
  const loginInput = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  const messageEl = document.getElementById('login-message')

  if (!loginInput || !password) {
    showMessage(messageEl, 'Введите логин и пароль', 'error')
    return
  }

  const { ok, data } = await apiRequest('/login', 'POST', { login: loginInput, password })

  if (ok) {
    currentUser = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(currentUser))
    updateUI()
    showPage('main')
    showNotification(`Добро пожаловать, ${currentUser.name}!`, 'Рады вас видеть!', 'success')
    document.getElementById('loginForm').reset()
    messageEl.style.display = 'none'
    await loadUserGoals()
  } else {
    showMessage(messageEl, data.error || 'Ошибка входа', 'error')
  }
}

async function register() {
  const name = document.getElementById('register-name').value.trim()
  const email = document.getElementById('register-email').value.trim()
  const login = document.getElementById('register-login').value.trim()
  const password = document.getElementById('register-password').value
  const confirmPassword = document.getElementById('register-confirm-password').value
  const messageEl = document.getElementById('register-message')

  if (!name || !email || !login || !password) {
    showMessage(messageEl, 'Все поля обязательны', 'error')
    return
  }
  if (password.length < 6) {
    showMessage(messageEl, 'Пароль минимум 6 символов', 'error')
    return
  }
  if (password !== confirmPassword) {
    showMessage(messageEl, 'Пароли не совпадают', 'error')
    return
  }

  const { ok, data } = await apiRequest('/register', 'POST', {
    name,
    email,
    login,
    password,
    avatar: registerAvatarData || null,
  })

  if (ok) {
    currentUser = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(currentUser))
    updateUI()
    showPage('main')
    showNotification('Регистрация успешна!', `Добро пожаловать, ${name}!`, 'success')
    document.getElementById('registerForm').reset()
    registerAvatarData = null
    messageEl.style.display = 'none'
    await loadUserGoals()
  } else {
    showMessage(messageEl, data.error || 'Ошибка регистрации', 'error')
  }
}

function logout() {
  if (confirm('Вы уверены?')) {
    currentUser = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    goals = []
    updateUI()
    showPage('main')
    showNotification('До свидания!', 'Ждем вас снова!', 'info')
  }
}

// ============================================
// РАБОТА С ЦЕЛЯМИ
// ============================================
async function loadUserGoals() {
  if (!currentUser) {
    console.log('⚠️ Нет пользователя, цели не загружаем')
    goals = []
    renderGoals()
    updateStats()
    return
  }

  try {
    const userId = currentUser.id
    console.log('📥 Загружаем цели для пользователя ID:', userId)
    console.log('👤 Информация о пользователе:', currentUser)

    const response = await fetch(`http://localhost:3000/api/goals/${userId}`)
    console.log('📥 Статус ответа:', response.status)

    if (response.ok) {
      goals = await response.json()
      console.log('📦 Загружено целей:', goals.length)
      console.log('📦 Данные:', goals)

      // ПРОВЕРЯЕМ: все ли цели принадлежат пользователю
      goals.forEach(goal => {
        console.log(`Цель "${goal.title}" принадлежит пользователю ${goal.user_id}, текущий пользователь ${userId}`)
      })

      renderGoals()
      updateStats()
    } else {
      const error = await response.json()
      console.error('❌ Ошибка загрузки целей:', error)
      showNotification('Ошибка загрузки целей', error.error || 'Попробуйте обновить страницу', 'error')
    }
  } catch (error) {
    console.error('❌ Ошибка сети при загрузке целей:', error)
    showNotification('Ошибка сети', 'Не удалось подключиться к серверу', 'error')
  }
}

async function addGoal() {
  if (!currentUser) {
    showAuthMessage('Для добавления желаний войдите в систему', 'error')
    showPage('auth')
    return
  }

  const title = document.getElementById('goal-title').value.trim()
  const description = document.getElementById('goal-description').value.trim()
  const category = document.getElementById('goal-category').value
  const date = document.getElementById('goal-date').value
  const priority = document.getElementById('goal-priority').value

  if (!title || !date) {
    showAuthMessage('Заполните название и дату', 'error')
    return
  }

  let targetAmount = null,
    savedAmount = null,
    progress = 0
  if (category === 'finance') {
    targetAmount = parseFloat(document.getElementById('goal-target-amount').value) || 0
    savedAmount = parseFloat(document.getElementById('goal-saved-amount').value) || 0
    if (targetAmount > 0) progress = Math.min(Math.round((savedAmount / targetAmount) * 100), 100)
  }

  const goalData = {
    userId: currentUser.id,
    title,
    description,
    category,
    date,
    priority,
    progress,
    image: goalImageData || null,
    targetAmount,
    savedAmount,
  }

  console.log('📤 Отправляем цель на сервер:', goalData)

  const { ok, data, status } = await apiRequest('/goals', 'POST', goalData)

  if (ok) {
    console.log('✅ Цель успешно создана! Ответ сервера:', data)
    goals.push(data)
    console.log('📊 Теперь целей в массиве:', goals.length)
    renderGoals()
    updateStats()
    resetGoalForm()
    showAuthMessage('Желание добавлено!', 'success')
    showNotification('Желание добавлено!', '🎯', 'success')
  } else {
    console.error('❌ Ошибка добавления цели. Статус:', status, 'Ответ:', data)
    showAuthMessage(data.error || 'Ошибка добавления', 'error')
  }
}

async function updateGoal(goalId) {
  const goal = goals.find(g => g.id === goalId)
  if (!goal) return

  const title = document.getElementById('goal-title').value.trim()
  const description = document.getElementById('goal-description').value.trim()
  const category = document.getElementById('goal-category').value
  const date = document.getElementById('goal-date').value
  const priority = document.getElementById('goal-priority').value

  if (!title || !date) {
    showAuthMessage('Заполните название и дату', 'error')
    return
  }

  let targetAmount = null,
    savedAmount = null,
    progress = 0
  if (category === 'finance') {
    targetAmount = parseFloat(document.getElementById('goal-target-amount').value) || 0
    savedAmount = parseFloat(document.getElementById('goal-saved-amount').value) || 0
    if (targetAmount > 0) progress = Math.min(Math.round((savedAmount / targetAmount) * 100), 100)
  } else {
    const progressElement = document.getElementById('progress-value')
    if (progressElement) {
      progress = parseInt(progressElement.textContent) || 0
    }
  }

  const goalData = {
    title,
    description,
    category,
    date,
    priority,
    progress,
    image: goalImageData !== null ? goalImageData : goal.image,
    targetAmount,
    savedAmount,
  }

  const { ok, data } = await apiRequest(`/goals/${goalId}`, 'PUT', goalData)

  if (ok) {
    Object.assign(goal, goalData)
    if (goalImageData !== null) goal.image = goalImageData
    renderGoals()
    updateStats()
    resetGoalForm()
    showAuthMessage('Желание обновлено!', 'success')
  } else {
    showAuthMessage(data.error || 'Ошибка обновления', 'error')
  }
}

async function deleteGoal(id) {
  if (!confirm('Удалить желание?')) return

  const { ok, data } = await apiRequest(`/goals/${id}`, 'DELETE')
  if (ok) {
    goals = goals.filter(goal => goal.id !== id)
    renderGoals()
    updateStats()
    showNotification('Желание удалено', '', 'success')
  } else {
    showNotification('Ошибка удаления', data.error || 'Попробуйте позже', 'error')
  }
}

function editGoal(id) {
  const goal = goals.find(g => g.id === id)
  if (!goal) return

  editingGoalId = id
  document.getElementById('goal-title').value = goal.title
  document.getElementById('goal-description').value = goal.description || ''
  document.getElementById('goal-date').value = goal.date
  document.getElementById('goal-priority').value = goal.priority || 'medium'

  if (goal.category === 'finance' && goal.targetAmount) {
    document.getElementById('goal-target-amount').value = goal.targetAmount
    document.getElementById('goal-saved-amount').value = goal.savedAmount || 0
    document.getElementById('finance-fields').style.display = 'block'
  } else {
    document.getElementById('finance-fields').style.display = 'none'
  }

  if (goal.image) {
    goalImageData = goal.image
    document.getElementById('image-preview-img').src = goal.image
    document.getElementById('image-preview-img').style.display = 'block'
    document.getElementById('image-preview-placeholder').style.display = 'none'
  } else {
    goalImageData = null
    document.getElementById('image-preview-img').style.display = 'none'
    document.getElementById('image-preview-placeholder').style.display = 'flex'
  }

  document.querySelectorAll('.category').forEach(cat => {
    cat.classList.remove('selected')
    if (cat.dataset.category === goal.category) {
      cat.classList.add('selected')
      document.getElementById('goal-category').value = goal.category
    }
  })

  const submitBtn = document.querySelector('#goal-form button[type="submit"]')
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения'
  document.querySelector('.left-panel').scrollIntoView({ behavior: 'smooth' })
}

// ============================================
// ОТОБРАЖЕНИЕ - ГЛАВНАЯ ФУНКЦИЯ (ИСПРАВЛЕНА)
// ============================================
function renderGoals() {
  const container = elements.goalsContainer
  container.innerHTML = ''

  console.log('🔄 renderGoals вызван')
  console.log('👤 Текущий пользователь:', currentUser)
  console.log('📊 Всего целей в массиве:', goals.length)

  if (!currentUser) {
    console.log('⚠️ Пользователь не авторизован')
    container.appendChild(elements.emptyState)
    elements.emptyState.style.display = 'block'
    return
  }

  // ФИЛЬТРУЕМ ЦЕЛИ ПО ID ПОЛЬЗОВАТЕЛЯ
  const userId = currentUser.id
  console.log('🔍 ID пользователя для фильтрации:', userId)
  console.log(
    '📋 Все цели до фильтрации:',
    goals.map(g => ({ id: g.id, user_id: g.user_id, title: g.title })),
  )

  let userGoals = goals.filter(g => {
    // ПРОВЕРЯЕМ ОБА ПОЛЯ: user_id (из БД) и userId (из фронта)
    const matches = g.user_id === userId || g.userId === userId
    if (!matches) {
      console.log(`❌ Цель "${g.title}" пропущена: user_id=${g.user_id}, userId=${g.userId}, ожидается=${userId}`)
    }
    return matches
  })

  console.log('📊 Целей пользователя после фильтрации:', userGoals.length)

  if (userGoals.length === 0) {
    console.log('📭 Нет целей, показываем пустое состояние')
    container.appendChild(elements.emptyState)
    elements.emptyState.style.display = 'block'
    return
  }
  elements.emptyState.style.display = 'none'

  // Сортировка по приоритету и дате
  userGoals.sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 }
    if (priority[a.priority] !== priority[b.priority]) return priority[a.priority] - priority[b.priority]
    return new Date(a.date) - new Date(b.date)
  })

  userGoals.forEach((goal, index) => {
    console.log(`🎯 Отрисовываем цель ${index + 1}:`, goal.title)
    const card = createGoalCard(goal)
    if (card) {
      container.appendChild(card)
    }
  })

  console.log('✅ Отрисовано карточек:', userGoals.length)
}

function createGoalCard(goal) {
  const card = document.createElement('div')
  card.className = 'goal-card'
  card.style.marginBottom = '20px'

  const categoryInfo = getCategoryInfo(goal.category)
  const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }
  const formattedDate = new Date(goal.date).toLocaleDateString('ru-RU')
  const daysUntil = calculateDaysUntil(goal.date)

  let financeHTML = ''
  if (goal.category === 'finance' && goal.targetAmount && goal.targetAmount > 0) {
    const saved = goal.savedAmount || 0
    const remaining = Math.max(0, goal.targetAmount - saved)
    const isCompleted = saved >= goal.targetAmount
    financeHTML = `
            <div class="goal-finance-info">
                <div class="finance-row">
                    <span class="finance-label"><i class="fas fa-bullseye money-icon"></i> Цель:</span>
                    <span class="finance-value">${formatCurrency(goal.targetAmount)}</span>
                </div>
                <div class="finance-row">
                    <span class="finance-label"><i class="fas fa-piggy-bank money-icon"></i> Накоплено:</span>
                    <span class="finance-value" style="color: ${isCompleted ? 'var(--secondary-color)' : 'var(--primary-color)'}">${formatCurrency(saved)}</span>
                </div>
                ${!isCompleted ? `<div class="finance-row"><span class="finance-label"><i class="fas fa-hourglass-half money-icon"></i> Осталось:</span><span class="finance-value">${formatCurrency(remaining)}</span></div>` : ''}
                ${isCompleted ? '<div style="text-align:center;margin-top:10px;color:var(--secondary-color);font-weight:600;">🎉 Цель достигнута!</div>' : ''}
            </div>
        `
  }

  card.innerHTML = `
        <div class="goal-image-container">
            ${
              goal.image
                ? `<img src="${goal.image}" class="goal-image" onerror="this.style.display='none'">`
                : `<div class="goal-no-image" style="background: linear-gradient(135deg, ${categoryInfo.color}, ${categoryInfo.color}cc)">
                <i class="fas fa-${categoryInfo.icon}"></i>
            </div>`
            }
        </div>
        <div class="goal-body">
            <div class="goal-title">
                <span>${escapeHtml(goal.title)}</span>
                <span class="goal-category" style="background-color: ${categoryInfo.color}20; color: ${categoryInfo.color}">
                    ${categoryInfo.name}
                </span>
            </div>
            <p class="goal-description">${escapeHtml(goal.description || '')}</p>
            ${financeHTML}
            <div class="goal-date">
                <i class="far fa-calendar-alt"></i> До ${formattedDate} (${daysUntil})
            </div>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${goal.progress || 0}%"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
                    <span>Прогресс: ${goal.progress || 0}%</span>
                    <span style="color: ${priorityColors[goal.priority] || '#9ca3af'}">
                        <i class="fas fa-flag"></i> ${getPriorityText(goal.priority)}
                    </span>
                </div>
            </div>
            <div class="goal-actions">
                <button class="btn-action btn-edit" onclick="editGoal(${goal.id})">
                    <i class="fas fa-edit"></i> Изменить
                </button>
                <button class="btn-action btn-delete" onclick="deleteGoal(${goal.id})">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        </div>
    `
  return card
}

function updateStats() {
  const userGoals = currentUser ? goals.filter(g => g.user_id === currentUser.id || g.userId === currentUser.id) : []
  elements.footerTotalGoals.textContent = userGoals.length
  elements.footerUpcomingGoals.textContent = userGoals.filter(g => new Date(g.date) >= new Date()).length

  if (document.getElementById('profile-page').classList.contains('active')) {
    updateProfilePage()
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function getCategoryInfo(category) {
  const categories = {
    finance: { name: 'Финансы', color: '#7c3aed', icon: 'money-bill-wave' },
    health: { name: 'Здоровье', color: '#10b981', icon: 'heartbeat' },
    education: { name: 'Образование', color: '#f59e0b', icon: 'graduation-cap' },
    travel: { name: 'Путешествия', color: '#3b82f6', icon: 'plane' },
    relationship: { name: 'Отношения', color: '#8b5cf6', icon: 'users' },
    career: { name: 'Карьера', color: '#f97316', icon: 'briefcase' },
  }
  return categories[category] || { name: 'Другое', color: '#9ca3af', icon: 'star' }
}

function getPriorityText(priority) {
  const texts = { high: 'Высокий', medium: 'Средний', low: 'Низкий' }
  return texts[priority] || 'Не указан'
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '0 ₽'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('RUB', '₽')
}

function calculateDaysUntil(dateString) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const goalDate = new Date(dateString)
  goalDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((goalDate - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'срок истек'
  if (diffDays === 0) return 'сегодня'
  if (diffDays === 1) return 'завтра'
  if (diffDays < 30) return `через ${diffDays} ${declOfNum(diffDays, ['день', 'дня', 'дней'])}`
  if (diffDays < 365)
    return `через ${Math.floor(diffDays / 30)} ${declOfNum(Math.floor(diffDays / 30), ['месяц', 'месяца', 'месяцев'])}`
  return `через ${Math.floor(diffDays / 365)} ${declOfNum(Math.floor(diffDays / 365), ['год', 'года', 'лет'])}`
}

function declOfNum(num, titles) {
  const cases = [2, 0, 1, 1, 1, 2]
  return titles[num % 100 > 4 && num % 100 < 20 ? 2 : cases[num % 10 < 5 ? num % 10 : 5]]
}

function showMessage(element, text, type) {
  element.textContent = text
  element.className = `message message-${type}`
  element.style.display = 'flex'
  setTimeout(() => (element.style.display = 'none'), 5000)
}

function showAuthMessage(text, type) {
  showMessage(elements.authMessage, text, type)
}

function resetGoalForm() {
  document.getElementById('goal-form').reset()
  document.getElementById('goal-image-input').value = ''
  document.getElementById('image-preview-img').style.display = 'none'
  document.getElementById('image-preview-placeholder').style.display = 'flex'
  goalImageData = null
  editingGoalId = null
  const submitBtn = document.querySelector('#goal-form button[type="submit"]')
  submitBtn.innerHTML = '<i class="fas fa-plus"></i> Добавить желание'
  document.querySelectorAll('.category').forEach(c => c.classList.remove('selected'))
  const firstCategory = document.querySelector('.category')
  if (firstCategory) firstCategory.classList.add('selected')
  document.getElementById('goal-category').value = 'finance'
  document.getElementById('finance-fields').style.display = 'none'
}

function showPage(pageId) {
  if (pageId === 'profile' && !currentUser) {
    showAuthMessage('Для просмотра профиля войдите в систему', 'error')
    showPage('auth')
    return
  }
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'))
  document.getElementById(`${pageId}-page`).classList.add('active')
  if (pageId === 'profile') updateProfilePage()
}

function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'))
  document.querySelector(`.auth-tab[onclick*="${tab}"]`).classList.add('active')
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'))
  document.getElementById(`${tab}-form`).classList.add('active')
}

function socialLogin(provider) {
  alert('В демо-версии используйте: demo / demo123')
}
function socialRegister(provider) {
  alert('В демо-версии зарегистрируйтесь через форму ниже')
}

// ============================================
// ОБНОВЛЕНИЕ UI
// ============================================
function updateUI() {
  if (currentUser) {
    elements.userName.textContent = currentUser.name
    if (currentUser.avatar) {
      elements.avatarImg.src = currentUser.avatar
      elements.avatarImg.style.display = 'block'
      elements.avatarText.style.display = 'none'
    } else {
      elements.avatarText.textContent = currentUser.name.charAt(0).toUpperCase()
      elements.avatarText.style.display = 'flex'
      elements.avatarImg.style.display = 'none'
    }
    elements.logoutBtn.style.display = 'flex'
    elements.loginBtn.style.display = 'none'
    elements.profileLink.style.display = 'flex'
  } else {
    elements.userName.textContent = 'Гость'
    elements.avatarText.textContent = 'Г'
    elements.avatarText.style.display = 'flex'
    elements.avatarImg.style.display = 'none'
    elements.logoutBtn.style.display = 'none'
    elements.loginBtn.style.display = 'flex'
    elements.profileLink.style.display = 'none'
  }
  renderGoals()
  updateStats()
}

function updateProfilePage() {
  if (!currentUser) return
  document.getElementById('profile-name').value = currentUser.name
  document.getElementById('profile-email').value = currentUser.email
  document.getElementById('profile-login').value = currentUser.login
  document.getElementById('profile-created').value = new Date(currentUser.createdAt).toLocaleDateString('ru-RU')

  const placeholder = document.getElementById('profile-avatar-placeholder')
  const preview = document.getElementById('profile-avatar-preview')
  if (currentUser.avatar) {
    preview.src = currentUser.avatar
    preview.style.display = 'block'
    placeholder.style.display = 'none'
  } else {
    placeholder.innerHTML = currentUser.name.charAt(0).toUpperCase()
    placeholder.style.display = 'flex'
    preview.style.display = 'none'
  }

  const userGoals = goals.filter(g => g.user_id === currentUser.id || g.userId === currentUser.id)
  document.getElementById('profile-total-goals').textContent = userGoals.length
  document.getElementById('profile-completed-goals').textContent = userGoals.filter(g => g.progress === 100).length
  document.getElementById('profile-active-goals').textContent = userGoals.filter(g => g.progress < 100).length
}

async function updateProfile() {
  if (!currentUser) return

  const name = document.getElementById('profile-name').value.trim()
  const email = document.getElementById('profile-email').value.trim()
  const login = document.getElementById('profile-login').value.trim()
  const messageEl = document.getElementById('profile-message')

  if (!name || !email || !login) {
    showMessage(messageEl, 'Все поля обязательны', 'error')
    return
  }

  const avatar = profileAvatarData || currentUser.avatar
  const { ok, data } = await apiRequest(`/users/${currentUser.id}`, 'PUT', {
    name,
    email,
    login,
    avatar,
  })

  if (ok) {
    currentUser.name = name
    currentUser.email = email
    currentUser.login = login
    if (profileAvatarData) currentUser.avatar = profileAvatarData
    localStorage.setItem('user', JSON.stringify(currentUser))
    profileAvatarData = null
    updateUI()
    showMessage(messageEl, 'Профиль обновлен!', 'success')
  } else {
    showMessage(messageEl, data.error || 'Ошибка обновления', 'error')
  }
}

// ============================================
// ЗАГРУЗКА ИЗОБРАЖЕНИЙ
// ============================================
function handleImageUpload(event, type) {
  const file = event.target.files[0]
  if (!file) return
  if (!file.type.match('image.*')) {
    alert('Выберите файл изображения')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Размер файла не должен превышать 5MB')
    return
  }

  const reader = new FileReader()
  reader.onload = function (e) {
    const imageData = e.target.result
    if (type === 'goal') {
      goalImageData = imageData
      document.getElementById('image-preview-img').src = imageData
      document.getElementById('image-preview-img').style.display = 'block'
      document.getElementById('image-preview-placeholder').style.display = 'none'
    } else if (type === 'register-avatar') {
      registerAvatarData = imageData
      document.getElementById('register-avatar-preview').src = imageData
      document.getElementById('register-avatar-preview').style.display = 'block'
      document.getElementById('register-avatar-placeholder').style.display = 'none'
    } else if (type === 'profile-avatar') {
      profileAvatarData = imageData
      document.getElementById('profile-avatar-preview').src = imageData
      document.getElementById('profile-avatar-preview').style.display = 'block'
      document.getElementById('profile-avatar-placeholder').style.display = 'none'
    }
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  goalImageData = null
  document.getElementById('image-preview-img').src = ''
  document.getElementById('image-preview-img').style.display = 'none'
  document.getElementById('image-preview-placeholder').style.display = 'flex'
  document.getElementById('goal-image-input').value = ''
}

// ============================================
// ПРОГРЕСС СЛАЙДЕР
// ============================================
function initSlider(initialProgress) {
  // Функция для слайдера при редактировании
}

function startDrag(e) {
  e.preventDefault()
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
function init() {
  console.log('🚀 Инициализация приложения...')

  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser)
      console.log('👤 Загружен пользователь:', currentUser.name)
      updateUI()
      loadUserGoals()
    } catch (e) {
      console.error('Ошибка загрузки пользователя:', e)
      localStorage.removeItem('user')
    }
  }

  const threeMonthsLater = new Date()
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
  const dateInput = document.getElementById('goal-date')
  if (dateInput) {
    dateInput.value = threeMonthsLater.toISOString().split('T')[0]
    dateInput.setAttribute('min', new Date().toISOString().split('T')[0])
  }

  const firstCategory = document.querySelector('.category')
  if (firstCategory) {
    firstCategory.classList.add('selected')
  }

  setupEventListeners()
  console.log('✅ Инициализация завершена')
}

function setupEventListeners() {
  document.querySelectorAll('.category').forEach(cat => {
    cat.addEventListener('click', function () {
      document.querySelectorAll('.category').forEach(c => c.classList.remove('selected'))
      this.classList.add('selected')
      document.getElementById('goal-category').value = this.dataset.category
      const financeFields = document.getElementById('finance-fields')
      financeFields.style.display = this.dataset.category === 'finance' ? 'block' : 'none'
    })
  })

  document.getElementById('goal-form').addEventListener('submit', function (e) {
    e.preventDefault()
    if (editingGoalId) {
      updateGoal(editingGoalId)
    } else {
      addGoal()
    }
  })

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault()
    login()
  })

  document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault()
    register()
  })

  document.getElementById('goal-image-input').addEventListener('change', function (e) {
    handleImageUpload(e, 'goal')
  })
  document.getElementById('register-avatar-input').addEventListener('change', function (e) {
    handleImageUpload(e, 'register-avatar')
  })
  document.getElementById('profile-avatar-input').addEventListener('change', function (e) {
    handleImageUpload(e, 'profile-avatar')
  })
}

document.addEventListener('DOMContentLoaded', init)
