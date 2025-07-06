# 🧠 AI-Powered Quiz Generator API v2

This project is a **FastAPI-based application** that enables automatic quiz generation using **Azure OpenAI's GPT-4o model**. It can process various file types (like `.pdf`, `.docx`, `.txt`, and videos), as well as extract text from web pages, and then generate quizzes such as **Multiple Choice**, **True/False**, and **Fill-in-the-Blank** questions.

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

## 🧠 How It Works

1. **Register/Login** to the API
2. **Upload a file** (PDF/DOCX/TXT/Video) OR **Submit a URL**
3. Choose a **quiz type**:
    - `mcq`: Multiple Choice
    - `tf`: True/False
    - `fib`: Fill-in-the-Blank
    - `video`: For video content (stub)
    - `url`: For website content
4. The system:
    - Extracts text
    - Sends it to GPT-4o with a structured prompt
    - Parses GPT’s response
    - Returns the quiz as structured JSON

---