\# JobZen – AI-Powered Career Assistant

JobZen is a full-stack AI-powered career preparation platform designed to help students and job seekers prepare for placements effectively.

It combines resume analysis, mock interviews, aptitude practice, chat-based assistance, and job recommendations into one intelligent system.

---

\## Features

\### Resume Analyzer

\- Upload and analyze resumes

\- Extract education, experience, skills

\- AI-based improvement suggestions

\### Mock Interviews

\- AI-generated interview questions

\- Technical \& HR rounds

\- Real-time response evaluation

\### Aptitude Practice

\- Logical reasoning

\- Quantitative aptitude

\- Score tracking

\### AI Chat Assistant

\- Career guidance

\- Interview preparation help

\- Resume feedback

\### Smart Recommendations

\- Job suggestions based on skills

\- Personalized career insights

---

\## Tech Stack

\### Frontend

\- React (Vite)

\- JavaScript

\- CSS

\### Backend

\- Python

\- FastAPI

\- SQLite

\- AI-based services

---

\## Project Structure

```bash

JobZen/

│

├── backend/

│   ├── app/

│   ├── requirements.txt

│

├── frontend/

│   ├── src/

│   ├── package.json

│

└── database.db

```

---

## Setting Up Environment Variables

1. Copy the `.env.example` file to create a `.env` file:

   ```bash
   cp .env.example .env

---

---

## Getting LLM key from gemini

1. Visit Google AI Studio
2. Sign in with your Google account
3. Click on "Get API Key" or "Create API Key"
4. Copy the generated API key
5. Add the API key to your .env file

---

\## How to Run the Project

Open two terminals: one for backend and one for frontend.

---

\### Prerequisites

Ensure the following are installed:

\- Python (3.9 or above)

\- Node.js (v16 or above)

\- npm

\- Git (optional)

---

\### Step 1: Clone the Repository

```bash

git clone https://github.com/Adhithiya14/Jobzen.git

```

---

\### Step 2: Go into the Project Folder

```bash

cd Jobzen

```

---

\### Step 3: Setup Backend

```bash

cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload

```

Backend runs at:

<http://localhost:8000>

---

\### Step 4: Setup Frontend

Open a second terminal:

```bash

cd frontend

npm install

npm run dev

```

Frontend runs at:

<http://localhost:5173>

---

\## Notes

\- Ensure backend is running before starting frontend

\- .env files are required for API keys

\- Node modules are not included in the repository

\- Database file (database.db) will be created automatically

---
