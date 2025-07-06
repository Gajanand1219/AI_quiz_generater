from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Dict
from openai import AzureOpenAI
import PyPDF2
import docx
import tempfile
import os
import json
import logging
from bs4 import BeautifulSoup
import requests

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure OpenAI config
client = AzureOpenAI(
    api_key="BsUWPGVTL2RhYwZ5zipkhRVMGqYFmNKiZrbVFJRtHTBmS2fjr7ImJQQJ99BBACYeBjFXJ3w3AAABACOGSehi",
    api_version="2023-03-15-preview",
    azure_endpoint="https://azureopenaimodel101.openai.azure.com/"
)
DEPLOYMENT_NAME = "gpt-4o"

# In-memory user store
users_db: Dict[str, Dict[str, str]] = {}

# Models
class UserRegister(BaseModel):
    username: str
    password: str

class QuizItem(BaseModel):
    question: str
    options: List[str]
    answer: str

class QuizResponse(BaseModel):
    quiz: List[QuizItem]

# Allowed file extensions
def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {
        'pdf', 'docx', 'txt', 'mp4', 'webm', 'mov'
    }

# Extract text from file
def extract_text_from_file(file_path: str, extension: str) -> str:
    try:
        if extension == 'pdf':
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                return ' '.join(page.extract_text() or '' for page in reader.pages)
        elif extension == 'docx':
            doc = docx.Document(file_path)
            return '\n'.join(p.text for p in doc.paragraphs)
        elif extension == 'txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            raise ValueError("Unsupported file format")
    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract text")

# Placeholder for video
async def extract_text_from_video(file_path: str) -> str:
    return "This is placeholder text extracted from video. In a real implementation, you'd use audio/video processing."

# Extract text from URL
async def extract_text_from_url(url: str) -> str:
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in soup(["script", "style"]): tag.decompose()
        return soup.get_text(separator='\n', strip=True)[:5000]
    except Exception as e:
        logger.error(f"URL extraction error: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing URL: {str(e)}")

# Generate quiz
async def generate_quiz(text: str, quiz_type: str) -> List[QuizItem]:
    try:
        text = text[:3000]
        prompt_map = {
            "mcq": f"""Generate 3 multiple choice questions with 4 options each. Return JSON:
{{
  "quiz": [{{"question": "...", "options": ["...", "...", "...", "..."], "answer": "..."}}]
}}
Text: {text}""",
            "tf": f"""Generate 5 True/False questions. Return JSON:
{{
  "quiz": [{{"question": "...", "options": ["True", "False"], "answer": "..."}}]
}}
Text: {text}""",
            "fib": f"""Generate 5 fill-in-the-blank questions. Return JSON:
{{
  "quiz": [{{"question": "... with _____", "options": [], "answer": "..."}}]
}}
Text: {text}""",
            "video": f"""Generate 3 questions from video content. Return JSON:
{{
  "quiz": [{{"question": "...", "options": ["...", "...", "...", "..."], "answer": "..."}}]
}}
Content: {text}""",
            "url": f"""Generate 5 questions about this web content. Return JSON:
{{
  "quiz": [{{"question": "...", "options": ["...", "...", "...", "..."], "answer": "..."}}]
}}
Content: {text}"""
        }

        prompt = prompt_map.get(quiz_type)
        if not prompt:
            raise HTTPException(status_code=400, detail="Invalid quiz type")

        response = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You are a quiz generator. Return valid JSON with required fields."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "")
        data = json.loads(raw)

        quiz = []
        for item in data.get("quiz", []):
            options = item.get("options", [])
            if not isinstance(options, list):  # fallback
                options = []
            quiz.append(QuizItem(
                question=item["question"],
                options=options,
                answer=item["answer"]
            ))

        return quiz

    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail="AI generation failed")

# Endpoint: generate quiz
@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz_endpoint(
    file: UploadFile = File(None),
    quiz_type: str = Form(...),
    url: str = Form(None)
):
    if quiz_type == "url" and not url:
        raise HTTPException(status_code=400, detail="URL required")
    if quiz_type in ["mcq", "tf", "fib", "video"] and not file:
        raise HTTPException(status_code=400, detail="File required")

    try:
        if url:
            text = await extract_text_from_url(url)
        else:
            if not allowed_file(file.filename):
                raise HTTPException(status_code=400, detail="Invalid file type")

            ext = file.filename.rsplit(".", 1)[1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
                contents = await file.read()
                tmp.write(contents)
                tmp_path = tmp.name

            try:
                if ext in ["mp4", "webm", "mov"]:
                    text = await extract_text_from_video(tmp_path)
                else:
                    text = extract_text_from_file(tmp_path, ext)
            finally:
                os.remove(tmp_path)

        quiz = await generate_quiz(text, quiz_type)
        return {"quiz": quiz}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Server error")

# Register endpoint
@app.post("/register")
def register(user: UserRegister):
    if user.username in users_db:
        raise HTTPException(status_code=400, detail="Username already exists")
    users_db[user.username] = {"password": user.password}
    return {"message": "User registered successfully"}

# Login endpoint
@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form_data.username)
    if not user or user["password"] != form_data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "username": form_data.username}
