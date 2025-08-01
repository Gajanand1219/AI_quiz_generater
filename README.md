# 🧠 AI Quiz Generator — Full Stack App




https://github.com/user-attachments/assets/67a4c49c-3e7b-4110-9b0e-189cd24bd0f0



An intelligent quiz generator built using **React (Frontend)** and **Python Flask (Backend)**, integrated with **Azure OpenAI** to automatically generate multiple-choice questions from text.

---

## 📌 What This Project Does

- Users input text or upload documents
- The backend sends the text to Azure OpenAI (GPT-4o)
- It generates a set of multiple-choice questions
- The frontend displays the generated quiz in a clean UI
- Users can retry, copy, or export the quiz

---

## 🚀 Features

- 📤 Upload files (`.pdf`, `.docx`, `.txt`, `.mp4`, `.webm`, `.mov`) to generate quiz questions.
- 🌐 Submit a webpage URL to extract readable content for quiz generation.
- 🧠 Generate AI-powered quiz types:
  - **Multiple Choice Questions (MCQs)**
  - **True/False**
  - **Fill in the Blank (FIB)**
  - **Video-based (placeholder implementation)**
  - **Web content-based (via URL)**
- 📊 Response includes detailed quiz structure with:
  - Questions
  - Options
  - Correct Answers
- 🔐 In-memory authentication for registering and logging in users.
- 🌍 Fully CORS-enabled REST API.
- 🛠️ File parsing using PyPDF2, python-docx, and BeautifulSoup.
- 💡 Error-handling, logging, and validation built-in.
- ⚙️ Powered by **Azure OpenAI GPT-4o**.

---

## 🛠️ Technologies Used

### Backend (Python Flask):
- Flask & Flask-CORS
- dotenv (env config)
- requests (for API calls)
- Azure OpenAI GPT-4o model

### Frontend (React):
- React 18+
- Axios (API calls)
- Material-UI or Bootstrap
- React Router (for multi-page setup)

### Other:
- GitHub for version control
- Vercel or Netlify for frontend deployment
- Render or Railway for backend deployment

---

## 🧠 How It Works

### ➤ 1. User Interface (React)

- A form to enter or upload quiz content
- Button triggers a POST request to backend `/api/generate`
- Displays the AI-generated quiz neatly

### ➤ 2. Backend Logic (Flask)

- Receives the content from frontend
- Passes it to Azure OpenAI’s `gpt-4o` deployment
- Parses the LLM response into structured JSON format
- Sends it back as a quiz

### ➤ 3. AI Prompt (project)

```text
AI_quiz_generator/
│
├── backend/
│   ├── app.py
│   ├── routes/
│   ├── services/
│   ├── .env
│   └── requirements.txt
│
├── quiz-frontend/
│   ├── src/
│   │   ├── components/
│   │   └── App.js
│   ├── public/
│   ├── .env
│   ├── .gitignore
│   └── package.json
│
└── README.md



## 🧰 Tech Stack

| Category            | Tool / Library                  |
|---------------------|---------------------------------|
| **API Framework**   | FastAPI                         |
| **Authentication**  | OAuth2PasswordRequestForm       |
| **AI Integration**  | Azure OpenAI (GPT-4o)           |
| **File Parsing**    | PyPDF2, python-docx             |
| **Web Scraping**    | BeautifulSoup, requests         |
| **Data Models**     | Pydantic                        |
| **Logging**         | Python's logging module         |
| **Text Extraction** | Custom logic per file type      |
| **Environment**     | Python 3.8+                     |

---
