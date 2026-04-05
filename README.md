# 💡 SkillSwap - Skill Exchange Platform

A full-stack web application where users can teach and learn skills, connect with others, and book sessions.

---

## 🚀 Features

* 👤 User Registration & Login
* 🧠 Add & Manage Skills
* 🔍 Find Teachers by Skill
* 📅 Book Sessions
* 💬 Messaging System
* ⭐ Reviews & Ratings
* ❤️ Favorites System
* 🔔 Notifications
* 📊 Dashboard Stats

---

## 🛠️ Tech Stack

### Frontend

* HTML
* CSS
* JavaScript (Vanilla)

### Backend

* Node.js
* Express.js

### Database

* MySQL

---

## 📁 Project Structure

dbms-project/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── .env
│
│   ├── routes/
│   │   └── routes.js
│
│   ├── sql/
│   │   └── skill_exchange_complete.sql
│
│   ├── config/
│   │   └── db.config.js
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
└── README.md

---

## ⚙️ Setup Instructions

### 1. Clone the repository

git clone <your-repo-link>
cd dbms-project

---

### 2. Setup Backend

cd backend
npm install

---

### 3. Configure Environment Variables

Create a `.env` file inside `/backend`:

PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=skill_exchange_db

---

### 4. Setup Database

* Open MySQL Workbench
* Run the SQL file:

backend/sql/skill_exchange_complete.sql

---

### 5. Run Backend Server

node server.js

Server runs on:
http://localhost:5000

---

### 6. Run Frontend

Open:

frontend/index.html

(Use Live Server recommended)

---

## 🔗 API Base URL

http://localhost:5000/api

---

## 🧪 Example APIs

* Register → POST /api/register
* Login → POST /api/login
* Get User → GET /api/user/:id
* Add Skill → POST /api/add-skill

---

## 👨‍💻 Author

Adi

---

## 📌 Notes

* Ensure MySQL is running before starting server
* Update `.env` with correct DB credentials
* CORS is enabled for local development

---

## ⭐ Future Improvements

* JWT Authentication
* Password Hashing (bcrypt)
* Real-time chat (Socket.io)
* UI Framework (React)
