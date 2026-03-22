import os
import sys
import json
import time
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import google.generativeai as genai
from sqlmodel import Session, select
from dotenv import load_dotenv

from backend.app.models.aptitude import AptitudeQuestion
from backend.app.core.db import engine

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
    sys.exit(1)

genai.configure(api_key=api_key)

CATEGORIES = [
    "Arithmetic Aptitude", "Data Interpretation", "Online Aptitude Test", "Data Interpretation Test",
    "Verbal Ability", "Logical Reasoning", "Verbal Reasoning", "Non Verbal Reasoning",
    "Current Affairs", "Basic General Knowledge", "General Science",
    "Placement Papers", "Group Discussion", "HR Interview",
    "Mechanical Engineering", "Civil Engineering", "ECE, EEE, CSE", "Chemical Engineering",
    "C Programming", "C++ Programming", "C# Programming", "Java Programming",
    "Aptitude Test", "Verbal Ability Test", "Logical Reasoning Test", "C Programming Test",
    "Networking Questions", "Database Questions", "Basic Electronics", "Digital Electronics",
    "Software Testing", "The C Language Basics", "SQL Server", "Networking",
    "Microbiology", "Biochemistry", "Biotechnology", "Biochemical Engineering",
    "Sudoku", "Number puzzles", "Missing letters puzzles", "Logical puzzles", "Clock puzzles"
]

def generate_questions_batch(category: str, num_questions=50):
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = f"""
    Create EXACTLY {num_questions} multiple-choice questions for the category '{category}', matching the style and topics found on Indiabix.com.
    
    CRITICAL: 
    - Provide exactly {num_questions} questions.
    - Output must be purely a JSON array of objects.

    Schema for each object:
    {{
        "question": "The question text",
        "option_a": "First option",
        "option_b": "Second option",
        "option_c": "Third option",
        "option_d": "Fourth option",
        "correct_option": "A",
        "explanation": "Short explanation"
    }}
    """
    
    try:
        response = model.generate_content(
            prompt, 
            generation_config=({"response_mime_type": "application/json"})
        )
        text = response.text.strip()
        
        # Strip markdown if present
        if text.startswith('```json'): text = text[7:]
        elif text.startswith('```'): text = text[3:]
        if text.endswith('```'): text = text[:-3]
        
        # Use regex to find all valid JSON objects if the array is malformed or truncated
        # We manually parse the blocks just in case
        questions = []
        try:
            questions = json.loads(text)
        except json.JSONDecodeError:
            print("Failed to parse full JSON array, extracting objects via regex...")
            # Fallback regex parsing
            matches = re.finditer(r'\{[^{}]*?"question"[^{}]*?"explanation"[^{}]*?\}', text, re.DOTALL)
            for m in matches:
                try:
                    q_obj = json.loads(m.group(0))
                    if 'question' in q_obj and 'correct_option' in q_obj:
                        questions.append(q_obj)
                except:
                    pass
        
        # Type check to ensure it's a list
        if isinstance(questions, dict) and "questions" in questions:
            questions = questions["questions"]
        elif not isinstance(questions, list):
            questions = []
            
        return questions
    except Exception as e:
        print(f"API Error for {category}: {str(e)[:200]}")
        return []

def main():
    total_added = 0
    with Session(engine) as session:
        for category in CATEGORIES:
            while True:
                count = session.exec(select(AptitudeQuestion).where(AptitudeQuestion.category == category)).all()
                needed = 50 - len(count)
                
                if needed <= 0:
                    print(f"[{category}] Full ({len(count)}q).")
                    break

                print(f"[{category}] Needs {needed} questions. Calling API...")
                q_list = generate_questions_batch(category, needed)
                
                if not q_list:
                    print(f"[{category}] Failed to generate or empty list. Sleeping 5s before retry...")
                    time.sleep(5)
                    continue
                    
                added_this_batch = 0
                for item in q_list:
                    if not isinstance(item, dict) or 'question' not in item or not item['question']:
                        continue
                    
                    # Stop adding if we hit the limit during this batch loop
                    if added_this_batch >= needed:
                        break

                    exists = session.exec(select(AptitudeQuestion).where(AptitudeQuestion.question == item['question'])).first()
                    if not exists:
                        try:
                            # Safely extract correct_option
                            corr_option = str(item.get('correct_option', 'A')).strip()
                            if not corr_option:
                                corr_option = 'A'
                            
                            q = AptitudeQuestion(
                                category=category,
                                question=str(item.get('question', '')),
                                option_a=str(item.get('option_a', '')),
                                option_b=str(item.get('option_b', '')),
                                option_c=str(item.get('option_c', '')),
                                option_d=str(item.get('option_d', '')),
                                correct_option=corr_option[:1].upper(),
                                explanation=str(item.get('explanation', ''))
                            )
                            session.add(q)
                            added_this_batch += 1
                        except Exception as e:
                            print(f"Error adding question to session: {e}")
                
                session.commit()
                total_added += added_this_batch
                print(f"[{category}] Added {added_this_batch} questions. (Target was: {needed})")
                
                time.sleep(4)
            
    print(f"Script Complete. Total new questions added: {total_added}")

if __name__ == "__main__":
    main()
