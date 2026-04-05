console.log("JS LOADED");
// ===== CONFIGURATION =====
const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
let selectedChatUser = null;
let allSkills = [];

// Toast notification
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            showToast(result.message || 'Error occurred', 'error');
            throw new Error(result.message);
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadHomePageData();
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateNavbar();
        showPage('dashboardPage');
        loadDashboardData();
    }
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Navigation
    document.getElementById('navHome').addEventListener('click', () => showPage('homePage'));
    document.getElementById('navAuth').addEventListener('click', () => showPage('authPage'));
    document.getElementById('navLogout').addEventListener('click', logout);
    document.getElementById('getStartedBtn').addEventListener('click', () => showPage('authPage'));

    // Auth Forms
    document.getElementById('toggleRegister').addEventListener('click', toggleAuthForm);
    document.getElementById('toggleLogin').addEventListener('click', toggleAuthForm);
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('registerBtn').addEventListener('click', register);

    // Skills
    document.getElementById('addSkillForm').addEventListener('submit', addSkill);
    document.getElementById('searchBtn').addEventListener('click', searchTeachers);

    // Requests
    document.getElementById('requestSkillForm').addEventListener('submit', requestSkill);

    // Messages
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageText').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Availability
    document.getElementById('addAvailabilityForm').addEventListener('submit', addAvailability);
}

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    document.getElementById('navHome').classList.toggle('active', pageId === 'homePage');
    document.getElementById('navAuth').classList.toggle('active', pageId === 'authPage');
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.sidebar-btn')?.classList.add('active');

    // Load data when section is shown
    if (sectionId === 'mySkills') loadMySkills();
    if (sectionId === 'findTeachers') loadSkillFilter();
    if (sectionId === 'requestSkill') loadSkillsForRequest();
    if (sectionId === 'mySessions') loadMySessions();
    if (sectionId === 'messages') loadMessagesSection();
    if (sectionId === 'availability') loadAvailability();
}

// ===== AUTHENTICATION =====
function toggleAuthForm() {
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('registerForm').classList.toggle('active');
}

async function register() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        showToast('Please fill all fields', 'warning');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    try {
        const result = await apiCall('/register', 'POST', { name, email, password });
        showToast('Registration successful! Please login.', 'success');
        toggleAuthForm();
        document.getElementById('registerForm').reset();
    } catch (error) {
        console.error('Registration error:', error);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please fill all fields', 'warning');
        return;
    }

    try {
        const result = await apiCall('/login', 'POST', { email, password });
        currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('loginForm').reset();
        updateNavbar();
        showPage('dashboardPage');
        loadDashboardData();
        showToast('Welcome back! 👋', 'success');
    } catch (error) {
        console.error('Login error:', error);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    showPage('homePage');
    updateNavbar();
    showToast('Logged out successfully', 'info');
}

function updateNavbar() {
    const authBtn = document.getElementById('navAuth');
    const userMenu = document.getElementById('userMenu');

    if (currentUser) {
        authBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('navUserName').textContent = currentUser.name;
        document.getElementById('sidebarName').textContent = currentUser.name;
        document.getElementById('sidebarEmail').textContent = currentUser.email;
    } else {
        authBtn.style.display = 'block';
        userMenu.style.display = 'none';
    }
}

// ===== HOME PAGE =====
async function loadHomePageData() {
    try {
        const skillsRes = await apiCall('/all-skills');
        const usersRes = await apiCall('/all-users');
        
        document.getElementById('totalSkills').textContent = skillsRes.count;
        document.getElementById('totalUsers').textContent = usersRes.count;
    } catch (error) {
        console.error('Error loading home page data:', error);
    }
}

// ===== DASHBOARD =====
async function loadDashboardData() {
    if (!currentUser) return;

    try {
        const skillsRes = await apiCall(`/user-skills/${currentUser.id}`);
        const sessionsRes = await apiCall(`/sessions/${currentUser.id}`);
        const reviewsRes = await apiCall(`/reviews/${currentUser.id}`);

        document.getElementById('dashTeachCount').textContent = skillsRes.count;
        document.getElementById('dashSessionCount').textContent = sessionsRes.sessions.filter(s => s.status === 'Completed').length;
        document.getElementById('dashRatingCount').textContent = reviewsRes.averageRating;
        document.getElementById('userRating').innerHTML = `
            <i class="fas fa-star"></i> 
            <span>${reviewsRes.averageRating}</span> 
            (${reviewsRes.totalReviews} reviews)
        `;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// ===== SKILLS =====
async function addSkill(e) {
    e.preventDefault();

    const skillName = document.getElementById('skillName').value.trim();
    const experienceLevel = document.getElementById('experienceLevel').value;
    const description = document.getElementById('skillDescription').value.trim();
    const ratePerHour = parseFloat(document.getElementById('ratePerHour').value) || 0;
    const hourlyCapacity = parseInt(document.getElementById('hourlyCapacity').value) || 10;

    if (!skillName || !experienceLevel) {
        showToast('Please fill required fields', 'warning');
        return;
    }

    try {
        await apiCall('/add-skill', 'POST', {
            userId: currentUser.id,
            skillName,
            experienceLevel,
            description,
            ratePerHour,
            hourlyCapacity
        });
        
        showToast('✅ Skill added successfully!', 'success');
        document.getElementById('addSkillForm').reset();
        loadMySkills();
        showSection('mySkills');
    } catch (error) {
        console.error('Error adding skill:', error);
    }
}

async function loadMySkills() {
    try {
        const result = await apiCall(`/user-skills/${currentUser.id}`);
        const skillsList = document.getElementById('skillsList');
        skillsList.innerHTML = '';

        if (result.skills.length === 0) {
            skillsList.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <p style="color: var(--gray); margin-bottom: 1rem;">No skills added yet</p>
                    <button class="btn btn-primary" onclick="showSection('addSkill')">
                        <i class="fas fa-plus"></i> Add Your First Skill
                    </button>
                </div>
            `;
            return;
        }

        result.skills.forEach(skill => {
            const skillEl = document.createElement('div');
            skillEl.className = 'card';
            skillEl.innerHTML = `
                <div class="card-header">
                    <div class="card-title">📚 ${skill.skill_name}</div>
                    <div class="card-subtitle">${skill.experience_level}</div>
                </div>
                <div class="card-body">
                    <p>${skill.description || 'No description provided'}</p>
                    <div class="skill-meta">
                        <span>💰 $${skill.rate_per_hour}/hr</span>
                        <span>⏱️ ${skill.hourly_capacity}hrs/week</span>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" onclick="editSkill(${skill.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary" onclick="deleteSkill(${skill.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            skillsList.appendChild(skillEl);
        });
    } catch (error) {
        console.error('Error loading skills:', error);
    }
}

async function deleteSkill(skillId) {
    if (!confirm('Are you sure you want to delete this skill?')) return;

    try {
        await apiCall(`/skill/${skillId}`, 'DELETE');
        showToast('✅ Skill deleted', 'success');
        loadMySkills();
    } catch (error) {
        console.error('Error deleting skill:', error);
    }
}

// ===== FIND TEACHERS =====
async function loadSkillFilter() {
    try {
        const result = await apiCall('/all-skills');
        allSkills = result.skills;
        const skillFilter = document.getElementById('skillFilter');
        skillFilter.innerHTML = '<option value="">🔍 Select a skill to find teachers...</option>';

        result.skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill.skill_name;
            option.textContent = skill.skill_name;
            skillFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading skills:', error);
    }
}

async function searchTeachers() {
    const skillName = document.getElementById('skillFilter').value;

    if (!skillName) {
        showToast('Please select a skill', 'warning');
        return;
    }

    try {
        const result = await apiCall(`/find-teachers/${skillName}`);
        const teachersList = document.getElementById('teachersList');
        teachersList.innerHTML = '';

        result.teachers.forEach(teacher => {
            const teacherEl = document.createElement('div');
            teacherEl.className = 'card';
            teacherEl.innerHTML = `
                <div class="card-header">
                    <div class="card-title">👨‍🏫 ${teacher.name}</div>
                    <div class="card-subtitle">${teacher.experience_level} • ⭐ ${teacher.rating || '0'}</div>
                </div>
                <div class="card-body">
                    <p><strong>About:</strong> ${teacher.bio || teacher.description || 'Experienced teacher'}</p>
                    <p><strong>Rate:</strong> $${teacher.rate_per_hour}/hour</p>
                    <p><strong>Email:</strong> ${teacher.email}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" onclick="openBookingForm(${teacher.id}, '${skillName}', '${teacher.name}')">
                        <i class="fas fa-calendar-plus"></i> Book Session
                    </button>
                    <button class="btn btn-secondary" onclick="startChat(${teacher.id}, '${teacher.name}')">
                        <i class="fas fa-comment"></i> Message
                    </button>
                </div>
            `;
            teachersList.appendChild(teacherEl);
        });
    } catch (error) {
        console.error('Error searching teachers:', error);
    }
}

// ===== BOOKING =====
function openBookingForm(teacherId, skillName, teacherName) {
    const sessionDate = prompt(`Enter session date and time for ${teacherName}:\n(Format: YYYY-MM-DD HH:MM:SS)`);
    if (!sessionDate) return;

    const duration = prompt('Duration in minutes:', '60');
    if (!duration) return;

    const notes = prompt('Any notes for the teacher?', '');

    bookSession(teacherId, skillName, sessionDate, duration, notes);
}

async function bookSession(teacherId, skillName, sessionDate, durationMinutes, notes) {
    try {
        await apiCall('/book-session', 'POST', {
            teacherId,
            learnerId: currentUser.id,
            skillName,
            sessionDate,
            durationMinutes: parseInt(durationMinutes),
            notes
        });

        showToast('✅ Session booked successfully!', 'success');
        loadMySessions();
    } catch (error) {
        console.error('Error booking session:', error);
    }
}

// ===== SESSIONS =====
async function loadMySessions() {
    try {
        const result = await apiCall(`/sessions/${currentUser.id}`);
        const sessionsList = document.getElementById('sessionsList');
        sessionsList.innerHTML = '';

        if (result.sessions.length === 0) {
            sessionsList.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <p style="color: var(--gray); margin-bottom: 1rem;">No sessions booked yet</p>
                    <button class="btn btn-primary" onclick="showSection('findTeachers')">
                        <i class="fas fa-search"></i> Find Teachers
                    </button>
                </div>
            `;
            return;
        }

        result.sessions.forEach(session => {
            const isTeacher = session.teacher_id === currentUser.id;
            const otherName = isTeacher ? session.learner_name : session.teacher_name;
            const otherEmail = isTeacher ? session.learner_email : session.teacher_email;
            const sessionDate = new Date(session.session_date).toLocaleString();

            const sessionEl = document.createElement('div');
            sessionEl.className = 'card';
            sessionEl.innerHTML = `
                <div class="card-header">
                    <div class="card-title">📅 ${session.skill_name}</div>
                    <div class="card-subtitle">${sessionDate}</div>
                </div>
                <div class="card-body">
                    <p><strong>With:</strong> ${otherName}</p>
                    <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
                    <p><strong>Status:</strong> <span style="color: var(--primary); font-weight: bold;">${session.status}</span></p>
                    ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
                </div>
                <div class="card-footer">
                    ${session.status === 'Scheduled' ? `
                        <button class="btn btn-primary" onclick="updateSessionStatus(${session.id}, 'Completed')">
                            <i class="fas fa-check"></i> Mark Complete
                        </button>
                        <button class="btn btn-secondary" onclick="updateSessionStatus(${session.id}, 'Cancelled')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    ` : session.status === 'Completed' && isTeacher ? `
                        <button class="btn btn-primary" onclick="openReviewForm(${session.id}, ${session.learner_id}, '${session.learner_name}')">
                            <i class="fas fa-star"></i> Leave Review
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="startChat(${isTeacher ? session.learner_id : session.teacher_id}, '${otherName}')">
                        <i class="fas fa-comment"></i> Message
                    </button>
                </div>
            `;
            sessionsList.appendChild(sessionEl);
        });
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

async function updateSessionStatus(sessionId, status) {
    try {
        await apiCall(`/session/${sessionId}/status`, 'PUT', { status });
        showToast(`✅ Session ${status}!`, 'success');
        loadMySessions();
    } catch (error) {
        console.error('Error updating session:', error);
    }
}

function openReviewForm(sessionId, userId, userName) {
    const rating = prompt(`Rate your experience with ${userName} (1-5):`, '5');
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
        showToast('Please enter a valid rating (1-5)', 'warning');
        return;
    }

    const review = prompt('Leave a review (optional):', '');
    leaveReview(sessionId, userId, rating, review);
}

async function leaveReview(sessionId, teacherId, rating, reviewText) {
    try {
        await apiCall('/add-review', 'POST', {
            sessionId,
            reviewerId: currentUser.id,
            teacherId,
            rating: parseInt(rating),
            reviewText
        });

        showToast('⭐ Thank you for your review!', 'success');
        loadMySessions();
    } catch (error) {
        console.error('Error adding review:', error);
    }
}

// ===== SKILL REQUESTS =====
async function loadSkillsForRequest() {
    try {
        const result = await apiCall('/all-skills');
        const skillToLearn = document.getElementById('skillToLearn');
        skillToLearn.innerHTML = '<option value="">Select a skill...</option>';

        result.skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill.skill_name;
            option.textContent = skill.skill_name;
            skillToLearn.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading skills:', error);
    }
}

async function requestSkill(e) {
    e.preventDefault();

    const skillName = document.getElementById('skillToLearn').value;
    const desiredLevel = document.getElementById('learningLevel').value;
    const reason = document.getElementById('learningReason').value.trim();

    if (!skillName || !desiredLevel) {
        showToast('Please fill required fields', 'warning');
        return;
    }

    try {
        await apiCall('/request-skill', 'POST', {
            userId: currentUser.id,
            skillName,
            desiredLevel,
            reason
        });

        showToast('✅ Skill request submitted!', 'success');
        document.getElementById('requestSkillForm').reset();
    } catch (error) {
        console.error('Error requesting skill:', error);
    }
}

// ===== MESSAGING =====
async function loadMessagesSection() {
    try {
        const result = await apiCall(`/contacts/${currentUser.id}`);
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';

        if (result.contacts.length === 0) {
            contactsList.innerHTML = '<p style="padding: 1rem; color: var(--gray);">No contacts yet</p>';
            return;
        }

        result.contacts.forEach(contact => {
            const contactEl = document.createElement('div');
            contactEl.className = 'contact-item';
            contactEl.onclick = () => selectContact(contact.id, contact.name);
            contactEl.innerHTML = `
                <div class="contact-name">${contact.name}</div>
                <div class="contact-preview">⭐ ${contact.rating || '0'}</div>
            `;
            contactsList.appendChild(contactEl);
        });
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

async function selectContact(userId, userName) {
    selectedChatUser = { id: userId, name: userName };
    
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    event.target.closest('.contact-item')?.classList.add('active');

    document.getElementById('chatHeader').innerHTML = `
        <h3>${userName}</h3>
    `;
    document.getElementById('chatInputBox').style.display = 'flex';

    await loadMessages(userId);
}

async function loadMessages(otherUserId) {
    try {
        const result = await apiCall(`/messages/${currentUser.id}/${otherUserId}`);
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';

        result.messages.forEach(msg => {
            const isSent = msg.sender_id === currentUser.id;
            const msgEl = document.createElement('div');
            msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
            msgEl.innerHTML = `
                <div class="message-bubble">
                    ${msg.message_text}
                    <div class="message-time">
                        ${new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                </div>
            `;
            chatMessages.appendChild(msgEl);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function sendMessage() {
    const messageText = document.getElementById('messageText').value.trim();
    
    if (!messageText || !selectedChatUser) {
        showToast('Please select a contact first', 'warning');
        return;
    }

    try {
        await apiCall('/send-message', 'POST', {
            senderId: currentUser.id,
            receiverId: selectedChatUser.id,
            messageText
        });

        document.getElementById('messageText').value = '';
        await loadMessages(selectedChatUser.id);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function startChat(userId, userName) {
    showSection('messages');
    setTimeout(() => selectContact(userId, userName), 100);
}

// ===== AVAILABILITY =====
async function loadAvailability() {
    try {
        const result = await apiCall(`/availability/${currentUser.id}`);
        const availabilityList = document.getElementById('availabilityList');
        availabilityList.innerHTML = '';

        if (result.availability.length === 0) {
            availabilityList.innerHTML = '<p style="color: var(--gray);">No availability slots added yet</p>';
            return;
        }

        result.availability.forEach(slot => {
            const slotEl = document.createElement('div');
            slotEl.className = 'skill-item';
            slotEl.innerHTML = `
                <h3>${slot.day_of_week}</h3>
                <p>⏰ ${slot.start_time} - ${slot.end_time}</p>
            `;
            availabilityList.appendChild(slotEl);
        });
    } catch (error) {
        console.error('Error loading availability:', error);
    }
}

async function addAvailability(e) {
    e.preventDefault();

    const dayOfWeek = document.getElementById('dayOfWeek').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!dayOfWeek || !startTime || !endTime) {
        showToast('Please fill all fields', 'warning');
        return;
    }

    try {
        await apiCall('/add-availability', 'POST', {
            userId: currentUser.id,
            dayOfWeek,
            startTime,
            endTime
        });

        showToast('✅ Availability added!', 'success');
        document.getElementById('addAvailabilityForm').reset();
        loadAvailability();
    } catch (error) {
        console.error('Error adding availability:', error);
    }
}