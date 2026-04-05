-- ========================================
-- SKILL EXCHANGE PLATFORM - COMPLETE DB
-- ========================================

-- Drop database if exists
DROP DATABASE IF EXISTS skill_exchange_db;
CREATE DATABASE skill_exchange_db;
USE skill_exchange_db;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    bio TEXT,
    profile_image VARCHAR(255),
    phone VARCHAR(20),
    location VARCHAR(100),
    rating DECIMAL(2, 1) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    total_sessions INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_rating (rating),
    INDEX idx_active (is_active)
);

-- =====================================================
-- 2. SKILLS TABLE
-- =====================================================
CREATE TABLE skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(100),
    description TEXT,
    difficulty_level ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
    in_demand BOOLEAN DEFAULT FALSE,
    teachers_count INT DEFAULT 0,
    learners_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_demand (in_demand)
);

-- =====================================================
-- 3. USER SKILLS TABLE (Skills users can teach)
-- =====================================================
CREATE TABLE user_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    experience_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
    years_of_experience INT,
    description TEXT,
    rate_per_hour DECIMAL(8, 2) DEFAULT 0,
    hourly_capacity INT DEFAULT 10,
    certificates VARCHAR(255),
    achievements TEXT,
    students_count INT DEFAULT 0,
    success_rate DECIMAL(3, 1) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skill (user_id, skill_id),
    INDEX idx_user (user_id),
    INDEX idx_skill (skill_id),
    INDEX idx_verified (is_verified)
);

-- =====================================================
-- 4. SKILL REQUESTS TABLE
-- =====================================================
CREATE TABLE skill_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    desired_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
    reason TEXT,
    urgency ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    budget_per_hour DECIMAL(8, 2),
    status ENUM('Open', 'Matched', 'Learning', 'Completed', 'Cancelled') DEFAULT 'Open',
    matched_teacher_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_skill (skill_id)
);

-- =====================================================
-- 5. SESSIONS TABLE (Booked learning sessions)
-- =====================================================
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    learner_id INT NOT NULL,
    skill_id INT NOT NULL,
    session_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    notes TEXT,
    session_type ENUM('Online', 'Offline', 'Hybrid') DEFAULT 'Online',
    meeting_link VARCHAR(255),
    meeting_location VARCHAR(255),
    status ENUM('Scheduled', 'In-Progress', 'Completed', 'Cancelled', 'No-Show') DEFAULT 'Scheduled',
    cancellation_reason VARCHAR(255),
    cancelled_by INT,
    cancelled_at TIMESTAMP NULL,
    actual_end_time DATETIME,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_teacher (teacher_id),
    INDEX idx_learner (learner_id),
    INDEX idx_date (session_date),
    INDEX idx_status (status)
);

-- =====================================================
-- 6. AVAILABILITY TABLE (Teacher availability slots)
-- =====================================================
CREATE TABLE availability (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    recurring BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_active (is_active)
);

-- =====================================================
-- 7. REVIEWS TABLE (Ratings and feedback)
-- =====================================================
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    teacher_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
    knowledge_rating INT CHECK (knowledge_rating >= 1 AND knowledge_rating <= 5),
    teaching_rating INT CHECK (teaching_rating >= 1 AND teaching_rating <= 5),
    review_text TEXT,
    would_recommend BOOLEAN DEFAULT TRUE,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher (teacher_id),
    INDEX idx_rating (rating)
);

-- =====================================================
-- 8. MESSAGES TABLE (Messaging system)
-- =====================================================
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message_text TEXT NOT NULL,
    message_type ENUM('Text', 'Image', 'File', 'Link') DEFAULT 'Text',
    attachment_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_receiver BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_conversation (sender_id, receiver_id),
    INDEX idx_created (created_at)
);

-- =====================================================
-- 9. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('Session', 'Message', 'Review', 'Request', 'System') DEFAULT 'System',
    related_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    action_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read),
    INDEX idx_type (notification_type)
);

-- =====================================================
-- 10. FAVORITES/WISHLIST TABLE
-- =====================================================
CREATE TABLE favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    teacher_id INT NOT NULL,
    skill_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, teacher_id, skill_id),
    INDEX idx_user (user_id)
);

-- =====================================================
-- 11. TRANSACTIONS/PAYMENTS TABLE
-- =====================================================
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    teacher_id INT NOT NULL,
    learner_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('Pending', 'Completed', 'Refunded', 'Failed') DEFAULT 'Pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255) UNIQUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_teacher (teacher_id)
);

-- =====================================================
-- 12. REPORTS TABLE (For flagging inappropriate content)
-- =====================================================
CREATE TABLE reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reporter_id INT NOT NULL,
    reported_user_id INT,
    session_id INT,
    report_type ENUM('Inappropriate', 'Spam', 'Fake', 'Harassment', 'Other') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Pending', 'Reviewing', 'Resolved', 'Dismissed') DEFAULT 'Pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_status (status)
);

-- =====================================================
-- 13. ANALYTICS TABLE (For tracking platform stats)
-- =====================================================
CREATE TABLE analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_type VARCHAR(50) NOT NULL,
    user_id INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_event (event_type),
    INDEX idx_created (created_at)
);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert Sample Skills (15 diverse skills)
INSERT INTO skills (skill_name, category, icon, description, difficulty_level, in_demand) VALUES
('Python Programming', 'Programming', '🐍', 'Learn Python for web, data science, and automation', 'Beginner', TRUE),
('Web Development', 'Programming', '🌐', 'Full-stack web development with modern frameworks', 'Intermediate', TRUE),
('JavaScript', 'Programming', '📜', 'JavaScript fundamentals and ES6+', 'Beginner', TRUE),
('React.js', 'Programming', '⚛️', 'Build interactive UIs with React', 'Intermediate', TRUE),
('Guitar', 'Music', '🎸', 'Learn acoustic and electric guitar', 'Beginner', FALSE),
('Piano', 'Music', '🎹', 'Piano lessons for all levels', 'Beginner', FALSE),
('Graphic Design', 'Design', '🎨', 'Professional graphic design with Adobe Creative Suite', 'Intermediate', TRUE),
('English Speaking', 'Languages', '🗣️', 'Improve English speaking and communication skills', 'Beginner', TRUE),
('French Language', 'Languages', '🇫🇷', 'Learn conversational French', 'Beginner', FALSE),
('Data Science', 'Programming', '📊', 'Master data analysis and machine learning', 'Advanced', TRUE),
('Digital Marketing', 'Business', '📱', 'Learn SEO, social media, and content marketing', 'Intermediate', TRUE),
('Video Editing', 'Design', '🎬', 'Professional video editing with Adobe Premiere', 'Intermediate', TRUE),
('Photography', 'Design', '📸', 'Master photography techniques and editing', 'Beginner', FALSE),
('Yoga', 'Health', '🧘', 'Yoga and meditation for wellness', 'Beginner', FALSE),
('Spanish Language', 'Languages', '🇪🇸', 'Learn conversational Spanish', 'Beginner', FALSE);

-- Insert Sample Users (15 teachers + learners)
INSERT INTO users (name, email, password, bio, location, phone, verified, is_active) VALUES
('Alice Johnson', 'alice@skillhub.com', 'hashed_password_123', 'Senior Python developer with 8+ years experience in backend development', 'San Francisco, CA', '+1-555-0101', TRUE, TRUE),
('Bob Smith', 'bob@skillhub.com', 'hashed_password_123', 'Full-stack web developer specializing in React and Node.js', 'New York, NY', '+1-555-0102', TRUE, TRUE),
('Charlie Brown', 'charlie@skillhub.com', 'hashed_password_123', 'Professional guitarist with 12 years of teaching experience', 'Los Angeles, CA', '+1-555-0103', TRUE, TRUE),
('Diana Prince', 'diana@skillhub.com', 'hashed_password_123', 'Digital marketing expert and social media strategist', 'Chicago, IL', '+1-555-0104', TRUE, TRUE),
('Evan Davis', 'evan@skillhub.com', 'hashed_password_123', 'Graphics designer and video editor for brands and content creators', 'Austin, TX', '+1-555-0105', TRUE, TRUE),
('Fiona Garcia', 'fiona@skillhub.com', 'hashed_password_123', 'Data science specialist with expertise in ML and AI', 'Seattle, WA', '+1-555-0106', TRUE, TRUE),
('George Wilson', 'george@skillhub.com', 'hashed_password_123', 'English language coach and pronunciation specialist', 'Boston, MA', '+1-555-0107', TRUE, TRUE),
('Hannah Lee', 'hannah@skillhub.com', 'hashed_password_123', 'French language teacher with native fluency', 'Miami, FL', '+1-555-0108', TRUE, TRUE),
('Isaac Martinez', 'isaac@skillhub.com', 'hashed_password_123', 'Piano instructor for beginners and advanced students', 'Denver, CO', '+1-555-0109', TRUE, TRUE),
('Julia Anderson', 'julia@skillhub.com', 'hashed_password_123', 'Professional photographer and photography instructor', 'Portland, OR', '+1-555-0110', TRUE, TRUE),
('Kevin Thompson', 'kevin@skillhub.com', 'hashed_password_123', 'Yoga instructor certified in multiple disciplines', 'Honolulu, HI', '+1-555-0111', TRUE, TRUE),
('Lisa Chen', 'lisa@skillhub.com', 'hashed_password_123', 'Spanish language tutor with cultural insights', 'San Diego, CA', '+1-555-0112', TRUE, TRUE),
('Mike Johnson', 'mike@skillhub.com', 'hashed_password_123', 'JavaScript expert teaching modern web development', 'Washington, DC', '+1-555-0113', TRUE, TRUE),
('Nancy Scott', 'nancy@skillhub.com', 'hashed_password_123', 'React specialist for frontend development', 'Philadelphia, PA', '+1-555-0114', TRUE, TRUE),
('Oliver Taylor', 'oliver@skillhub.com', 'hashed_password_123', 'Video production and editing professional', 'Atlanta, GA', '+1-555-0115', TRUE, TRUE);

-- Insert User Skills (Teachers teaching skills)
INSERT INTO user_skills (user_id, skill_id, experience_level, years_of_experience, rate_per_hour, hourly_capacity, is_verified) VALUES
(1, 1, 'Advanced', 8, 85.00, 15, TRUE),
(1, 10, 'Advanced', 6, 95.00, 10, TRUE),
(2, 2, 'Advanced', 7, 75.00, 12, TRUE),
(2, 4, 'Advanced', 6, 80.00, 10, TRUE),
(3, 5, 'Advanced', 12, 55.00, 20, TRUE),
(4, 11, 'Advanced', 9, 65.00, 14, TRUE),
(5, 7, 'Advanced', 8, 70.00, 12, TRUE),
(5, 12, 'Advanced', 7, 75.00, 10, TRUE),
(6, 10, 'Advanced', 5, 90.00, 12, TRUE),
(7, 8, 'Advanced', 10, 45.00, 18, TRUE),
(8, 9, 'Advanced', 7, 50.00, 15, TRUE),
(9, 6, 'Advanced', 6, 60.00, 12, TRUE),
(10, 13, 'Advanced', 8, 55.00, 14, TRUE),
(11, 14, 'Advanced', 10, 50.00, 16, TRUE),
(12, 15, 'Advanced', 6, 48.00, 14, TRUE),
(13, 3, 'Advanced', 9, 70.00, 13, TRUE),
(14, 4, 'Advanced', 5, 75.00, 11, TRUE),
(15, 12, 'Advanced', 8, 80.00, 12, TRUE);

-- Insert Skill Requests (Learners requesting skills)
INSERT INTO skill_requests (user_id, skill_id, desired_level, reason, urgency, budget_per_hour, status, matched_teacher_id) VALUES
(1, 10, 'Intermediate', 'Want to transition into data science career', 'High', 80.00, 'Matched', 6),
(3, 4, 'Beginner', 'Building interactive websites for my startup', 'Medium', 70.00, 'Matched', 14),
(5, 1, 'Beginner', 'Learning automation for my current job', 'Medium', 80.00, 'Matched', 1),
(7, 8, 'Beginner', 'Improving English for job interviews', 'High', 40.00, 'Matched', 7),
(9, 11, 'Intermediate', 'Launching my business online', 'High', 60.00, 'Open', NULL),
(11, 2, 'Beginner', 'Building my first website', 'Medium', 60.00, 'Matched', 2),
(13, 5, 'Beginner', 'Learning guitar as a hobby', 'Low', 50.00, 'Matched', 3),
(2, 15, 'Beginner', 'Learning Spanish for travel', 'Low', 45.00, 'Open', NULL),
(4, 6, 'Beginner', 'Taking piano lessons for relaxation', 'Low', 55.00, 'Matched', 9),
(6, 9, 'Beginner', 'Preparing for France trip', 'Medium', 45.00, 'Open', NULL);

-- Insert Sessions
INSERT INTO sessions (teacher_id, learner_id, skill_id, session_date, duration_minutes, notes, session_type, meeting_link, status) VALUES
(1, 3, 1, '2024-01-15 10:00:00', 60, 'Introduction to Python basics', 'Online', 'https://meet.google.com/abc-123-def', 'Completed'),
(2, 3, 4, '2024-01-16 14:00:00', 90, 'React hooks and state management', 'Online', 'https://meet.google.com/ghi-456-jkl', 'Completed'),
(3, 13, 5, '2024-01-17 18:00:00', 60, 'Basic guitar chords and strumming', 'Offline', NULL, 'Completed'),
(6, 1, 10, '2024-01-18 11:00:00', 120, 'Introduction to data science with Python', 'Online', 'https://meet.google.com/mno-789-pqr', 'Completed'),
(7, 7, 8, '2024-01-19 09:00:00', 60, 'English conversation practice', 'Online', 'https://meet.google.com/stu-012-vwx', 'Completed'),
(14, 3, 4, '2024-01-20 15:00:00', 60, 'Advanced React patterns', 'Online', 'https://meet.google.com/yza-345-bcd', 'Scheduled'),
(9, 4, 6, '2024-01-21 10:00:00', 60, 'Piano fundamentals', 'Offline', NULL, 'Scheduled'),
(1, 5, 1, '2024-01-22 13:00:00', 90, 'Python for automation - part 2', 'Online', 'https://meet.google.com/efg-678-hij', 'In-Progress');

-- Insert Reviews
INSERT INTO reviews (session_id, reviewer_id, teacher_id, rating, communication_rating, knowledge_rating, teaching_rating, review_text, would_recommend, tags) VALUES
(1, 3, 1, 5, 5, 5, 5, 'Excellent teacher! Very clear explanations and patient with beginners.', TRUE, '["Clear", "Patient", "Knowledgeable"]'),
(2, 3, 2, 5, 4, 5, 5, 'Great session on React hooks. Will definitely book again!', TRUE, '["Expert", "Practical", "Helpful"]'),
(3, 13, 3, 5, 5, 4, 5, 'Charlie is an amazing guitarist and very encouraging. Love the lessons!', TRUE, '["Encouraging", "Professional", "Fun"]'),
(4, 1, 6, 4, 5, 5, 4, 'Very knowledgeable about data science. Would appreciate more hands-on exercises.', TRUE, '["Knowledgeable", "Detailed"]'),
(5, 7, 7, 5, 5, 5, 5, 'Perfect English coach! My pronunciation has improved significantly.', TRUE, '["Professional", "Effective", "Supportive"]');

-- Insert Messages (Conversations)
INSERT INTO messages (sender_id, receiver_id, message_text, message_type, is_read) VALUES
(1, 3, 'Hi! I am interested in learning Python. Are you available this week?', 'Text', TRUE),
(3, 1, 'Hi! Yes, I have slots on Monday, Wednesday, and Friday. What time works for you?', 'Text', TRUE),
(1, 3, 'Friday at 10 AM would be perfect!', 'Text', TRUE),
(3, 1, 'Great! See you Friday at 10 AM. I will send you the meeting link soon.', 'Text', TRUE),
(2, 3, 'Ready for our React session today?', 'Text', FALSE),
(7, 7, 'Your English has improved so much! Keep practicing!', 'Text', FALSE),
(13, 3, 'Thanks for the guitar lesson yesterday. Really helpful!', 'Text', FALSE),
(3, 13, 'You are a quick learner! Excited for your next session.', 'Text', FALSE);

-- Insert Availability
INSERT INTO availability (user_id, day_of_week, start_time, end_time, timezone, is_active, recurring) VALUES
(1, 'Monday', '09:00:00', '17:00:00', 'PST', TRUE, TRUE),
(1, 'Wednesday', '10:00:00', '18:00:00', 'PST', TRUE, TRUE),
(1, 'Friday', '09:00:00', '17:00:00', 'PST', TRUE, TRUE),
(2, 'Tuesday', '14:00:00', '20:00:00', 'EST', TRUE, TRUE),
(2, 'Thursday', '14:00:00', '20:00:00', 'EST', TRUE, TRUE),
(2, 'Saturday', '10:00:00', '16:00:00', 'EST', TRUE, TRUE),
(3, 'Monday', '18:00:00', '21:00:00', 'PST', TRUE, TRUE),
(3, 'Wednesday', '18:00:00', '21:00:00', 'PST', TRUE, TRUE),
(3, 'Friday', '17:00:00', '21:00:00', 'PST', TRUE, TRUE),
(3, 'Saturday', '14:00:00', '20:00:00', 'PST', TRUE, TRUE),
(4, 'Tuesday', '10:00:00', '18:00:00', 'CST', TRUE, TRUE),
(4, 'Thursday', '10:00:00', '18:00:00', 'CST', TRUE, TRUE),
(7, 'Monday', '08:00:00', '14:00:00', 'EST', TRUE, TRUE),
(7, 'Wednesday', '08:00:00', '14:00:00', 'EST', TRUE, TRUE),
(7, 'Friday', '08:00:00', '14:00:00', 'EST', TRUE, TRUE);

-- Insert Notifications
INSERT INTO notifications (user_id, title, message, notification_type, related_id, is_read) VALUES
(3, 'New Session Booked', 'Alice Johnson booked a session with you for Python Programming', 'Session', 1, TRUE),
(1, 'Session Completed', 'Your session with Bob Smith for Python Programming is completed', 'Session', 1, TRUE),
(3, 'New Review', 'Alice Johnson left you a 5-star review', 'Review', 1, FALSE),
(7, 'New Message', 'You have a new message from student about English lessons', 'Message', 5, FALSE),
(13, 'Skill Request', 'New learner interested in your Guitar skills', 'Request', NULL, FALSE);

-- Insert Favorites
INSERT INTO favorites (user_id, teacher_id, skill_id) VALUES
(3, 1, 1),
(3, 2, 4),
(13, 3, 5),
(1, 6, 10),
(7, 7, 8);

-- Insert Transactions
INSERT INTO transactions (session_id, teacher_id, learner_id, amount, currency, status, payment_method, transaction_id) VALUES
(1, 1, 3, 85.00, 'USD', 'Completed', 'Credit Card', 'TXN-001-123456'),
(2, 2, 3, 120.00, 'USD', 'Completed', 'Credit Card', 'TXN-002-123457'),
(3, 3, 13, 55.00, 'USD', 'Completed', 'PayPal', 'TXN-003-123458'),
(4, 6, 1, 180.00, 'USD', 'Completed', 'Credit Card', 'TXN-004-123459'),
(5, 7, 7, 45.00, 'USD', 'Completed', 'Credit Card', 'TXN-005-123460');

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_user_created ON users(created_at);
CREATE INDEX idx_skills_teachers ON user_skills(user_id);
CREATE INDEX idx_messages_read ON messages(is_read);
CREATE INDEX idx_sessions_completed ON sessions(status, session_date);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify data insertion
SELECT 'Users' AS Table_Name, COUNT(*) AS Count FROM users
UNION ALL
SELECT 'Skills', COUNT(*) FROM skills
UNION ALL
SELECT 'User_Skills', COUNT(*) FROM user_skills
UNION ALL
SELECT 'Skill_Requests', COUNT(*) FROM skill_requests
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages
UNION ALL
SELECT 'Availability', COUNT(*) FROM availability
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transactions;

-- View sample user skills with ratings
SELECT 
    u.id,
    u.name,
    u.email,
    u.rating,
    u.total_reviews,
    COUNT(us.id) as skills_taught
FROM users u
LEFT JOIN user_skills us ON u.id = us.user_id
WHERE u.verified = TRUE
GROUP BY u.id
ORDER BY u.rating DESC;

-- View active sessions
SELECT 
    s.id,
    u1.name as teacher,
    u2.name as learner,
    sk.skill_name,
    s.session_date,
    s.status
FROM sessions s
JOIN users u1 ON s.teacher_id = u1.id
JOIN users u2 ON s.learner_id = u2.id
JOIN skills sk ON s.skill_id = sk.id
WHERE s.status IN ('Scheduled', 'In-Progress')
ORDER BY s.session_date;