const express = require('express');
const db = require('../db');
const router = express.Router();

// ===== HELPER FUNCTIONS =====
const queryAsync = (query, values = []) => {
    return new Promise((resolve, reject) => {
        db.query(query, values, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

// =====================================================
// 1. USER REGISTRATION
// =====================================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, location } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // Check if user exists
        const existing = await queryAsync('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Create verification token
        const verificationToken = Math.random().toString(36).substring(2, 15);

        const result = await queryAsync(
            'INSERT INTO users (name, email, password, phone, location, verification_token) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, password, phone || null, location || null, verificationToken]
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            userId: result.insertId,
            user: { id: result.insertId, name, email }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

// =====================================================
// 2. USER LOGIN
// =====================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const users = await queryAsync(
            'SELECT id, name, email, bio, location, phone, rating, total_reviews, verified FROM users WHERE email = ? AND password = ? AND is_active = TRUE',
            [email, password]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        
        // Get user's skills count
        const skills = await queryAsync('SELECT COUNT(*) as count FROM user_skills WHERE user_id = ?', [user.id]);

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                ...user,
                skillsCount: skills[0]?.count || 0
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});

// =====================================================
// 3. GET USER PROFILE WITH STATS
// =====================================================
router.get('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const users = await queryAsync(
            'SELECT id, name, email, bio, location, phone, rating, total_reviews, total_sessions, verified, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        // Get user's skills
        const skills = await queryAsync(`
            SELECT us.id, s.skill_name, us.experience_level, us.rate_per_hour, us.students_count, us.success_rate
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.id
            WHERE us.user_id = ?
        `, [userId]);

        // Get recent reviews
        const reviews = await queryAsync(`
            SELECT r.rating, r.review_text, r.created_at, u.name as reviewer_name
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            WHERE r.teacher_id = ?
            ORDER BY r.created_at DESC
            LIMIT 5
        `, [userId]);

        // Get availability
        const availability = await queryAsync(
            'SELECT day_of_week, start_time, end_time FROM availability WHERE user_id = ? AND is_active = TRUE',
            [userId]
        );

        res.json({
            success: true,
            user: {
                ...user,
                skills,
                reviews,
                availability,
                skillsCount: skills.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
    }
});

// =====================================================
// 4. UPDATE USER PROFILE
// =====================================================
router.put('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, bio, phone, location } = req.body;

        await queryAsync(
            'UPDATE users SET name = ?, bio = ?, phone = ?, location = ? WHERE id = ?',
            [name || '', bio || '', phone || null, location || null, userId]
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
    }
});

// =====================================================
// 5. ADD SKILL TO TEACH
// =====================================================
router.post('/add-skill', async (req, res) => {
    try {
        const { userId, skillName, experienceLevel, years, description, ratePerHour, hourlyCapacity, certificates } = req.body;

        if (!userId || !skillName || !experienceLevel) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Get or create skill
        let skills = await queryAsync('SELECT id FROM skills WHERE skill_name = ?', [skillName]);
        let skillId;

        if (skills.length > 0) {
            skillId = skills[0].id;
        } else {
            const skillResult = await queryAsync(
                'INSERT INTO skills (skill_name, category, difficulty_level) VALUES (?, ?, ?)',
                [skillName, 'General', experienceLevel]
            );
            skillId = skillResult.insertId;
        }

        // Check if user already has this skill
        const existing = await queryAsync(
            'SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ?',
            [userId, skillId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'You already have this skill' });
        }

        const result = await queryAsync(
            `INSERT INTO user_skills 
             (user_id, skill_id, experience_level, years_of_experience, description, rate_per_hour, hourly_capacity, certificates, is_verified) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, skillId, experienceLevel, years || null, description || '', ratePerHour || 0, hourlyCapacity || 10, certificates || null, FALSE]
        );

        // Update skill's teachers count
        await queryAsync('UPDATE skills SET teachers_count = teachers_count + 1 WHERE id = ?', [skillId]);

        res.status(201).json({
            success: true,
            message: 'Skill added successfully!',
            skillId: result.insertId
        });
    } catch (error) {
        console.error('Add skill error:', error);
        res.status(500).json({ success: false, message: 'Error adding skill', error: error.message });
    }
});

// =====================================================
// 6. GET USER'S SKILLS WITH DETAILS
// =====================================================
router.get('/user-skills/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const skills = await queryAsync(`
            SELECT us.id, s.skill_name, s.category, us.experience_level, us.description,
                   us.rate_per_hour, us.hourly_capacity, us.students_count, us.success_rate,
                   us.is_verified, us.created_at
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.id
            WHERE us.user_id = ?
            ORDER BY us.created_at DESC
        `, [userId]);

        res.json({ success: true, skills, count: skills.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching skills', error: error.message });
    }
});

// =====================================================
// 7. DELETE/REMOVE SKILL
// =====================================================
router.delete('/skill/:skillId/:userId', async (req, res) => {
    try {
        const { skillId, userId } = req.params;

        // Get skill_id from user_skills
        const userSkill = await queryAsync('SELECT skill_id FROM user_skills WHERE id = ? AND user_id = ?', [skillId, userId]);
        
        if (userSkill.length === 0) {
            return res.status(404).json({ success: false, message: 'Skill not found' });
        }

        const skillDbId = userSkill[0].skill_id;

        await queryAsync('DELETE FROM user_skills WHERE id = ? AND user_id = ?', [skillId, userId]);
        await queryAsync('UPDATE skills SET teachers_count = teachers_count - 1 WHERE id = ?', [skillDbId]);

        res.json({ success: true, message: 'Skill deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting skill', error: error.message });
    }
});

// =====================================================
// 8. REQUEST A SKILL (Learner)
// =====================================================
router.post('/request-skill', async (req, res) => {
    try {
        const { userId, skillName, desiredLevel, reason, urgency, budgetPerHour } = req.body;

        if (!userId || !skillName || !desiredLevel) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const skills = await queryAsync('SELECT id FROM skills WHERE skill_name = ?', [skillName]);

        if (skills.length === 0) {
            return res.status(404).json({ success: false, message: 'Skill not found' });
        }

        const skillId = skills[0].id;

        const result = await queryAsync(
            `INSERT INTO skill_requests 
             (user_id, skill_id, desired_level, reason, urgency, budget_per_hour) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, skillId, desiredLevel, reason || '', urgency || 'Medium', budgetPerHour || null]
        );

        // Update learners count
        await queryAsync('UPDATE skills SET learners_count = learners_count + 1 WHERE id = ?', [skillId]);

        res.status(201).json({
            success: true,
            message: 'Skill request created!',
            requestId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error requesting skill', error: error.message });
    }
});

// =====================================================
// 9. FIND TEACHERS FOR A SKILL (Matching System)
// =====================================================
router.get('/find-teachers/:skillName', async (req, res) => {
    try {
        const skillName = req.params.skillName;
        const { level, maxRate, location } = req.query;

        let query = `
            SELECT u.id, u.name, u.email, u.bio, u.location, u.phone, u.rating, u.total_reviews,
                   us.experience_level, us.description, us.rate_per_hour, us.hourly_capacity, 
                   us.students_count, us.success_rate
            FROM users u
            INNER JOIN user_skills us ON u.id = us.user_id
            INNER JOIN skills s ON us.skill_id = s.id
            WHERE s.skill_name = ? AND u.verified = TRUE AND us.is_verified = TRUE
        `;

        const params = [skillName];

        if (level) {
            query += ` AND us.experience_level = ?`;
            params.push(level);
        }

        if (maxRate) {
            query += ` AND us.rate_per_hour <= ?`;
            params.push(maxRate);
        }

        query += ` ORDER BY u.rating DESC, us.success_rate DESC LIMIT 50`;

        const teachers = await queryAsync(query, params);

        if (teachers.length === 0) {
            return res.status(404).json({ success: false, message: 'No teachers found for this skill' });
        }

        res.json({
            success: true,
            message: `Found ${teachers.length} teacher(s) for ${skillName}`,
            teachers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error finding teachers', error: error.message });
    }
});

// =====================================================
// 10. SEARCH TEACHERS BY NAME/LOCATION
// =====================================================
router.get('/search-teachers', async (req, res) => {
    try {
        const { query, location, minRating, maxRate } = req.query;

        let sql = `
            SELECT u.id, u.name, u.email, u.bio, u.location, u.rating, u.total_reviews,
                   COUNT(us.id) as skills_count
            FROM users u
            LEFT JOIN user_skills us ON u.id = us.user_id
            WHERE u.verified = TRUE AND u.is_active = TRUE
        `;

        const params = [];

        if (query) {
            sql += ` AND (u.name LIKE ? OR u.bio LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`);
        }

        if (location) {
            sql += ` AND u.location LIKE ?`;
            params.push(`%${location}%`);
        }

        if (minRating) {
            sql += ` AND u.rating >= ?`;
            params.push(minRating);
        }

        sql += ` GROUP BY u.id ORDER BY u.rating DESC LIMIT 50`;

        const teachers = await queryAsync(sql, params);

        res.json({ success: true, teachers, count: teachers.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error searching teachers', error: error.message });
    }
});

// =====================================================
// 11. GET SKILL REQUESTS (For teacher to see)
// =====================================================
router.get('/skill-requests', async (req, res) => {
    try {
        const { skillId, status } = req.query;

        let query = `
            SELECT sr.id, sr.user_id, u.name, u.email, u.location, sr.desired_level, 
                   sr.reason, sr.urgency, sr.budget_per_hour, sr.status, s.skill_name
            FROM skill_requests sr
            JOIN users u ON sr.user_id = u.id
            JOIN skills s ON sr.skill_id = s.id
            WHERE sr.status = 'Open'
        `;

        const params = [];

        if (skillId) {
            query += ` AND sr.skill_id = ?`;
            params.push(skillId);
        }

        if (status) {
            query += ` AND sr.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY sr.created_at DESC LIMIT 50`;

        const requests = await queryAsync(query, params);

        res.json({ success: true, requests, count: requests.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching requests', error: error.message });
    }
});

// =====================================================
// 12. MATCH TEACHER TO SKILL REQUEST
// =====================================================
router.put('/match-request/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { teacherId } = req.body;

        if (!teacherId) {
            return res.status(400).json({ success: false, message: 'Teacher ID required' });
        }

        // Update request with matched teacher
        await queryAsync(
            'UPDATE skill_requests SET status = ?, matched_teacher_id = ? WHERE id = ?',
            ['Matched', teacherId, requestId]
        );

        // Get request details for notification
        const request = await queryAsync(
            'SELECT user_id, skill_id FROM skill_requests WHERE id = ?',
            [requestId]
        );

        // Create notification for learner
        const skill = await queryAsync('SELECT skill_name FROM skills WHERE id = ?', [request[0].skill_id]);
        const teacher = await queryAsync('SELECT name FROM users WHERE id = ?', [teacherId]);

        await queryAsync(
            'INSERT INTO notifications (user_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
            [request[0].user_id, 'Match Found!', `${teacher[0].name} can teach you ${skill[0].skill_name}!`, 'Request']
        );

        res.json({ success: true, message: 'Learner matched with teacher successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error matching request', error: error.message });
    }
});

// =====================================================
// 13. BOOK A SESSION
// =====================================================
router.post('/book-session', async (req, res) => {
    try {
        const { teacherId, learnerId, skillName, sessionDate, durationMinutes, notes, sessionType, meetingLink } = req.body;

        if (!teacherId || !learnerId || !skillName || !sessionDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const skills = await queryAsync('SELECT id FROM skills WHERE skill_name = ?', [skillName]);

        if (skills.length === 0) {
            return res.status(404).json({ success: false, message: 'Skill not found' });
        }

        const skillId = skills[0].id;

        // Check for scheduling conflicts
        const conflict = await queryAsync(
            `SELECT id FROM sessions 
             WHERE (teacher_id = ? OR learner_id = ?) 
             AND session_date = ? 
             AND status IN ('Scheduled', 'In-Progress')`,
            [teacherId, learnerId, sessionDate]
        );

        if (conflict.length > 0) {
            return res.status(400).json({ success: false, message: 'Time slot already booked' });
        }

        const result = await queryAsync(
            `INSERT INTO sessions 
             (teacher_id, learner_id, skill_id, session_date, duration_minutes, notes, session_type, meeting_link, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
            [teacherId, learnerId, skillId, sessionDate, durationMinutes || 60, notes || '', sessionType || 'Online', meetingLink || null]
        );

        // Update teacher's total sessions
        await queryAsync('UPDATE users SET total_sessions = total_sessions + 1 WHERE id = ?', [teacherId]);

        // Create notification for teacher
        const learner = await queryAsync('SELECT name FROM users WHERE id = ?', [learnerId]);
        await queryAsync(
            'INSERT INTO notifications (user_id, title, message, notification_type, related_id) VALUES (?, ?, ?, ?, ?)',
            [teacherId, 'New Session Booked', `${learner[0].name} booked a session with you for ${skillName}`, 'Session', result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Session booked successfully!',
            sessionId: result.insertId
        });
    } catch (error) {
        console.error('Book session error:', error);
        res.status(500).json({ success: false, message: 'Error booking session', error: error.message });
    }
});

// =====================================================
// 14. GET SESSIONS FOR USER
// =====================================================
router.get('/sessions/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { status } = req.query;

        let query = `
            SELECT s.id, s.teacher_id, s.learner_id, s.session_date, s.duration_minutes,
                   s.notes, s.status, s.session_type, s.meeting_link, s.meeting_location,
                   sk.skill_name, t.name as teacher_name, t.email as teacher_email,
                   l.name as learner_name, l.email as learner_email
            FROM sessions s
            INNER JOIN skills sk ON s.skill_id = sk.id
            INNER JOIN users t ON s.teacher_id = t.id
            INNER JOIN users l ON s.learner_id = l.id
            WHERE (s.teacher_id = ? OR s.learner_id = ?)
        `;

        const params = [userId, userId];

        if (status) {
            query += ` AND s.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY s.session_date DESC LIMIT 100`;

        const sessions = await queryAsync(query, params);

        res.json({ success: true, sessions, count: sessions.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching sessions', error: error.message });
    }
});

// =====================================================
// 15. UPDATE SESSION STATUS
// =====================================================
router.put('/session/:sessionId/status', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const { status, cancellationReason, cancelledBy } = req.body;

        if (!['Scheduled', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const updateData = [status, sessionId];
        let updateQuery = 'UPDATE sessions SET status = ?';

        if (status === 'Cancelled') {
            updateQuery += ', cancellation_reason = ?, cancelled_by = ?, cancelled_at = NOW()';
            updateData.splice(1, 0, cancellationReason || null, cancelledBy || null);
        }

        if (status === 'Completed') {
            updateQuery += ', actual_end_time = NOW()';
        }

        updateQuery += ' WHERE id = ?';

        await queryAsync(updateQuery, updateData);

        res.json({ success: true, message: `Session ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating session', error: error.message });
    }
});

// =====================================================
// 16. ADD AVAILABILITY
// =====================================================
router.post('/add-availability', async (req, res) => {
    try {
        const { userId, dayOfWeek, startTime, endTime, timezone } = req.body;

        if (!userId || !dayOfWeek || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const result = await queryAsync(
            'INSERT INTO availability (user_id, day_of_week, start_time, end_time, timezone) VALUES (?, ?, ?, ?, ?)',
            [userId, dayOfWeek, startTime, endTime, timezone || 'UTC']
        );

        res.status(201).json({ success: true, message: 'Availability added', availabilityId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding availability', error: error.message });
    }
});

// =====================================================
// 17. GET AVAILABILITY
// =====================================================
router.get('/availability/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const availability = await queryAsync(
            'SELECT id, day_of_week, start_time, end_time, timezone FROM availability WHERE user_id = ? AND is_active = TRUE ORDER BY day_of_week',
            [userId]
        );

        res.json({ success: true, availability, count: availability.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching availability', error: error.message });
    }
});

// =====================================================
// 18. ADD REVIEW (After session)
// =====================================================
router.post('/add-review', async (req, res) => {
    try {
        const { sessionId, reviewerId, teacherId, rating, communicationRating, knowledgeRating, teachingRating, reviewText, wouldRecommend, tags } = req.body;

        if (!sessionId || !reviewerId || !teacherId || !rating) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1-5' });
        }

        // Check if review already exists
        const existing = await queryAsync('SELECT id FROM reviews WHERE session_id = ?', [sessionId]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Review already exists' });
        }

        const result = await queryAsync(
            `INSERT INTO reviews 
             (session_id, reviewer_id, teacher_id, rating, communication_rating, knowledge_rating, teaching_rating, review_text, would_recommend, tags) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, reviewerId, teacherId, rating, communicationRating || null, knowledgeRating || null, teachingRating || null, reviewText || '', wouldRecommend !== false, tags ? JSON.stringify(tags) : null]
        );

        // Update teacher's average rating and review count
        const reviews = await queryAsync(
            'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE teacher_id = ?',
            [teacherId]
        );

        const avgRating = parseFloat(reviews[0].avg_rating || 0).toFixed(1);
        const totalReviews = reviews[0].total || 0;

        await queryAsync(
            'UPDATE users SET rating = ?, total_reviews = ? WHERE id = ?',
            [avgRating, totalReviews, teacherId]
        );

        res.status(201).json({ success: true, message: 'Review added successfully', reviewId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding review', error: error.message });
    }
});

// =====================================================
// 19. GET REVIEWS
// =====================================================
router.get('/reviews/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const reviews = await queryAsync(
            `SELECT r.id, r.rating, r.communication_rating, r.knowledge_rating, r.teaching_rating, 
                    r.review_text, r.would_recommend, r.created_at, u.name as reviewer_name
             FROM reviews r
             JOIN users u ON r.reviewer_id = u.id
             WHERE r.teacher_id = ?
             ORDER BY r.created_at DESC
             LIMIT 50`,
            [userId]
        );

        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : 0;

        res.json({ success: true, reviews, averageRating: avgRating, totalReviews: reviews.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
});

// =====================================================
// 20. SEND MESSAGE
// =====================================================
router.post('/send-message', async (req, res) => {
    try {
        const { senderId, receiverId, messageText, messageType, attachmentUrl } = req.body;

        if (!senderId || !receiverId || !messageText) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const result = await queryAsync(
            'INSERT INTO messages (sender_id, receiver_id, message_text, message_type, attachment_url) VALUES (?, ?, ?, ?, ?)',
            [senderId, receiverId, messageText, messageType || 'Text', attachmentUrl || null]
        );

        // Create notification
        const sender = await queryAsync('SELECT name FROM users WHERE id = ?', [senderId]);
        await queryAsync(
            'INSERT INTO notifications (user_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
            [receiverId, 'New Message', `${sender[0].name} sent you a message`, 'Message']
        );

        res.status(201).json({ success: true, message: 'Message sent', messageId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending message', error: error.message });
    }
});

// =====================================================
// 21. GET MESSAGES (Conversation)
// =====================================================
router.get('/messages/:userId/:otherUserId', async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;
        const { limit = 100 } = req.query;

        const messages = await queryAsync(
            `SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.message_type, m.attachment_url,
                    m.is_read, m.created_at, sender.name as sender_name, receiver.name as receiver_name
             FROM messages m
             INNER JOIN users sender ON m.sender_id = sender.id
             INNER JOIN users receiver ON m.receiver_id = receiver.id
             WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
             AND m.deleted_by_sender = FALSE AND m.deleted_by_receiver = FALSE
             ORDER BY m.created_at ASC
             LIMIT ?`,
            [userId, otherUserId, otherUserId, userId, parseInt(limit)]
        );

        // Mark messages as read
        await queryAsync(
            'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE receiver_id = ? AND sender_id = ?',
            [userId, otherUserId]
        );

        res.json({ success: true, messages, count: messages.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching messages', error: error.message });
    }
});

// =====================================================
// 22. GET CONTACTS (Conversation List)
// =====================================================
router.get('/contacts/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const contacts = await queryAsync(
            `SELECT DISTINCT u.id, u.name, u.email, u.bio, u.rating,
                    MAX(m.created_at) as last_message_time,
                    (SELECT message_text FROM messages WHERE 
                     ((sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id))
                     ORDER BY created_at DESC LIMIT 1) as last_message
             FROM users u
             INNER JOIN messages m ON ((u.id = m.sender_id AND m.receiver_id = ?) 
                                        OR (u.id = m.receiver_id AND m.sender_id = ?))
             WHERE u.id != ? AND u.is_active = TRUE
             GROUP BY u.id
             ORDER BY last_message_time DESC
             LIMIT 50`,
            [userId, userId, userId, userId, userId]
        );

        res.json({ success: true, contacts, count: contacts.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching contacts', error: error.message });
    }
});

// =====================================================
// 23. GET ALL SKILLS
// =====================================================
router.get('/all-skills', async (req, res) => {
    try {
        const { category, inDemand } = req.query;

        let query = 'SELECT id, skill_name, category, icon, teachers_count, learners_count FROM skills';
        const params = [];

        if (category) {
            query += ' WHERE category = ?';
            params.push(category);
        }

        if (inDemand === 'true') {
            query += (params.length > 0 ? ' AND' : ' WHERE') + ' in_demand = TRUE';
        }

        query += ' ORDER BY skill_name';

        const skills = await queryAsync(query, params);

        res.json({ success: true, skills, count: skills.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching skills', error: error.message });
    }
});

// =====================================================
// 24. GET ALL USERS (For directory)
// =====================================================
router.get('/all-users', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const users = await queryAsync(
            'SELECT id, name, email, bio, location, rating, total_reviews, verified FROM users WHERE is_active = TRUE ORDER BY rating DESC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );

        res.json({ success: true, users, count: users.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
    }
});

// =====================================================
// 25. ADD TO FAVORITES
// =====================================================
router.post('/add-favorite', async (req, res) => {
    try {
        const { userId, teacherId, skillId } = req.body;

        if (!userId || !teacherId || !skillId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const existing = await queryAsync(
            'SELECT id FROM favorites WHERE user_id = ? AND teacher_id = ? AND skill_id = ?',
            [userId, teacherId, skillId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Already in favorites' });
        }

        const result = await queryAsync(
            'INSERT INTO favorites (user_id, teacher_id, skill_id) VALUES (?, ?, ?)',
            [userId, teacherId, skillId]
        );

        res.status(201).json({ success: true, message: 'Added to favorites', favoriteId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding favorite', error: error.message });
    }
});

// =====================================================
// 26. GET FAVORITES
// =====================================================
router.get('/favorites/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const favorites = await queryAsync(
            `SELECT f.id, u.id as teacher_id, u.name, u.rating, u.email, s.skill_name
             FROM favorites f
             JOIN users u ON f.teacher_id = u.id
             JOIN skills s ON f.skill_id = s.id
             WHERE f.user_id = ?
             ORDER BY f.created_at DESC`,
            [userId]
        );

        res.json({ success: true, favorites, count: favorites.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching favorites', error: error.message });
    }
});

// =====================================================
// 27. GET NOTIFICATIONS
// =====================================================
router.get('/notifications/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { unreadOnly = false } = req.query;

        let query = 'SELECT id, title, message, notification_type, is_read, created_at FROM notifications WHERE user_id = ?';
        const params = [userId];

        if (unreadOnly === 'true') {
            query += ' AND is_read = FALSE';
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const notifications = await queryAsync(query, params);

        res.json({ success: true, notifications, count: notifications.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
    }
});

// =====================================================
// 28. MARK NOTIFICATION AS READ
// =====================================================
router.put('/notification/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;

        await queryAsync(
            'UPDATE notifications SET is_read = TRUE WHERE id = ?',
            [notificationId]
        );

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating notification', error: error.message });
    }
});

// =====================================================
// 29. GET DASHBOARD STATS
// =====================================================
router.get('/dashboard-stats/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Total skills
        const skills = await queryAsync('SELECT COUNT(*) as count FROM user_skills WHERE user_id = ?', [userId]);

        // Total completed sessions
        const completedSessions = await queryAsync(
            'SELECT COUNT(*) as count FROM sessions WHERE (teacher_id = ? OR learner_id = ?) AND status = "Completed"',
            [userId, userId]
        );

        // Teaching sessions
        const teachingSessions = await queryAsync(
            'SELECT COUNT(*) as count FROM sessions WHERE teacher_id = ? AND status = "Completed"',
            [userId]
        );

        // Upcomingessions
        const upcomingSessions = await queryAsync(
            'SELECT COUNT(*) as count FROM sessions WHERE (teacher_id = ? OR learner_id = ?) AND status IN ("Scheduled", "In-Progress") AND session_date > NOW()',
            [userId, userId]
        );

        // Total earnings
        const earnings = await queryAsync(
            'SELECT SUM(amount) as total FROM transactions WHERE teacher_id = ? AND status = "Completed"',
            [userId]
        );

        // Average rating
        const rating = await queryAsync('SELECT rating, total_reviews FROM users WHERE id = ?', [userId]);

        // Unread messages
        const messages = await queryAsync(
            'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({
            success: true,
            stats: {
                skillsCount: skills[0]?.count || 0,
                completedSessions: completedSessions[0]?.count || 0,
                teachingSessions: teachingSessions[0]?.count || 0,
                upcomingSessions: upcomingSessions[0]?.count || 0,
                earnings: earnings[0]?.total || 0,
                rating: rating[0]?.rating || 0,
                totalReviews: rating[0]?.total_reviews || 0,
                unreadMessages: messages[0]?.count || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
    }
});

// =====================================================
// 30. REPORT USER/SESSION
// =====================================================
router.post('/report', async (req, res) => {
    try {
        const { reporterId, reportedUserId, sessionId, reportType, description } = req.body;

        if (!reporterId || !reportType || !description) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const result = await queryAsync(
            'INSERT INTO reports (reporter_id, reported_user_id, session_id, report_type, description) VALUES (?, ?, ?, ?, ?)',
            [reporterId, reportedUserId || null, sessionId || null, reportType, description]
        );

        res.status(201).json({ success: true, message: 'Report submitted successfully', reportId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting report', error: error.message });
    }
});

module.exports = router;