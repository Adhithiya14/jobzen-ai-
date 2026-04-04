from pydantic import BaseModel
from typing import List, Optional
import random
from starlette.concurrency import run_in_threadpool

class QuestionResponse(BaseModel):
    question: str
    context: str
    difficulty: Optional[str] = None
    hint: Optional[str] = None
    options: Optional[List[str]] = None
    correct_option: Optional[str] = None # For internal/grading use if revealed immediately

class GradeResponse(BaseModel):
    score: int
    feedback: str
    correct_answer_summary: str

class InterviewService:
    def __init__(self):
        self.questions_db = {
            "Software Engineer": ["Explain Process vs Thread", "REST vs SOAP", "Explain Big O Notation", "What is Dependency Injection?"],
            "Data Scientist": ["Explain Overfitting vs Underfitting", "How does Random Forest work?", "Explain p-value in simple terms"],
            "Product Manager": ["How do you prioritize features?", "Explain a time you said 'No' to a stakeholder", "Define MVP"],
            "Aptitude": ["Train A moves at 60kmph...", "If A is father of B...", "Find the missing number: 2, 4, 8, ..."]
        }

    def _generate_mock_question(self, topic: str, question_type: str, history: List[str]) -> QuestionResponse:
        import random
        
        # 1. Aptitude / GK
        if question_type == "Aptitude" or question_type == "GK":
            pool = self.questions_db["Aptitude"] + [
                "What is 15% of 80?",
                "If RED is 27, what is BLUE?"
            ]
            num1 = random.randint(10, 99)
            num2 = random.randint(10, 99)
            pool.append(f"What is {num1} + {num2}?")
            
            selected = random.choice([q for q in pool if q not in history] or pool)
            return QuestionResponse(question=selected, context=f"{question_type} Basic", options=["A", "B", "C", "D"])

        # 2. HR
        if question_type == "HR":
            pool = [
                "Tell me about yourself.",
                "Why do you want to join our company?",
                "What is your biggest weakness?",
                "Describe a time you handled a conflict."
            ]
            selected = random.choice([q for q in pool if q not in history] or pool)
            return QuestionResponse(question=selected, context="HR Round")

        # 3. Technical
        pool = self.questions_db.get(topic, [])
        if not pool:
            pool = [
                f"What are the core principles of {topic}?",
                f"Describe a challenging project you worked on as a {topic}.",
                f"What tools are essential for a {topic}?"
            ]
        
        available = [q for q in pool if q not in history]
        if not available:
            base = random.choice(pool)
            available = [f"Can you elaborate more on '{base}'?"]
            
        return QuestionResponse(question=available[0], context=f"{topic} Technical")

    def _grade_mock_answer(self, question: str, answer: str) -> GradeResponse:
        # Smart Mock Grading
        score = 6
        feedback = "Your response has been captured. While I'm currently optimizing my deep-analysis engine, I can see you've provided a thoughtful answer!"
        
        words = answer.split()
        if len(words) < 5:
            score = 3
            feedback = "Your answer seems a bit brief. In a real interview, providing more detail and specific examples helps demonstrate your expertise."
        elif any(word in answer.lower() for word in ["because", "ensure", "process", "data", "code", "react", "python", "leverages", "implements"]):
            score = 8
            feedback = "Excellent! You've used relevant industry terminology and structured your response effectively. Keep maintaining this level of detail!"

        ideal_answers = {
            "Explain Process vs Thread": "A process is an executing program with its own isolated memory space, while a thread is a lightweight execution unit within a process that shares the same memory. Threads can communicate more efficiently but require synchronization.",
            "REST vs SOAP": "REST is an architectural style using standard HTTP protocols and loosely coupled JSON payloads. SOAP is a strict protocol relying on heavy XML schemas with built-in security features, often used for legacy enterprise transactions.",
            "Explain Big O Notation": "Big O notation mathematically describes the worst-case time or space complexity of an algorithm as the input size grows. For instance, accessing a hash map is O(1), while sorting is typically O(N log N).",
            "What is Dependency Injection?": "Dependency Injection is a design pattern where an object receives its dependencies from an external framework rather than creating them. This ensures loose coupling, makes unit testing easier, and supports Inversion of Control.",
            "Tell me about yourself.": "I am a dedicated professional with a strong foundation in [your specialty]. In my recent projects, I successfully built [Example] which improved [Metric]. I am looking to bring my proactive problem-solving skills to a dynamic team.",
            "Why do you want to join our company?": "I've been following your recent work in [domain] and I deeply admire your engineering culture. I am eager to apply my skills to accelerate your goals and further develop my career in such an innovative environment.",
            "What is your biggest weakness?": "I sometimes take on too many responsibilities at once. However, I have recently adopted strict agile prioritization and time-boxing methods to ensure I manage my workload efficiently and meet critical deadlines."
        }
        
        correct_summary = ideal_answers.get(question, "A strong answer should clearly define the core concept, explain its practical application, and provide a brief example of a time you logically implemented or managed it in a real-world scenario.")

        return GradeResponse(
            score=score,
            feedback=feedback,
            correct_answer_summary=f"Ideal Answer Example: '{correct_summary}'"
        )

    async def generate_question(
        self, 
        topic: str = "Software Engineer", 
        question_type: str = "Technical", 
        history: List[str] = [],
        previous_question: str = None,
        user_answer: str = None,
        previous_score: int = 0,
        current_level: str = "Beginner"
    ) -> QuestionResponse:
        from backend.app.core.config import settings
        from backend.app.services.resume import resume_service
        from backend.app.core.prompts import MOCK_INTERVIEW_PROMPT_TEMPLATE, SYSTEM_PROMPT, RESUME_AWARE_CONTEXT_TEMPLATE
        import google.generativeai as genai
        import json
        
        # Explicit Mock Mode or Missing Key
        if not settings.cleaned_gemini_api_key or "your_gemini_api_key" in settings.cleaned_gemini_api_key:
             return self._generate_mock_question(topic, question_type, history)

        try:
            genai.configure(api_key=settings.cleaned_gemini_api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Prepare Resume Context
            resume_text = resume_service.get_current_resume_text()
            resume_context_str = ""
            if resume_text:
                resume_context_str = RESUME_AWARE_CONTEXT_TEMPLATE.format(resume_text=resume_text[:15000])
            else:
                resume_context_str = "No resume provided. Candidate role: " + topic

            # Construct Prompt
            if question_type == "Aptitude":
                 from backend.app.core.prompts import APTITUDE_PROMPT_TEMPLATE
                 prompt = APTITUDE_PROMPT_TEMPLATE.format(
                    system_prompt=SYSTEM_PROMPT,
                    resume_context=resume_context_str,
                    N=1
                 )
            else:
                 prompt = MOCK_INTERVIEW_PROMPT_TEMPLATE.format(
                    system_prompt=SYSTEM_PROMPT,
                    resume_context=resume_context_str,
                    role=topic,
                    question_type=question_type,
                    previous_question=previous_question or "None",
                    user_answer=user_answer or "None",
                    previous_score=previous_score,
                    difficulty=current_level
                 )
            
            # Optimize Generation config for speed
            generation_config = genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=150, # Force short JSON output
                response_mime_type="application/json"
            )
            
            response = await run_in_threadpool(model.generate_content, prompt, generation_config=generation_config)
            text = response.text.strip().replace("```json", "").replace("```", "")
            data = json.loads(text)
            
            return QuestionResponse(**data)

        except Exception as e:
            print(f"DEBUG: Error in generation (using fallback): {e}")
            return self._generate_mock_question(topic, question_type, history)

    async def grade_answer(self, question: str, answer: str, role: str = "Software Engineer") -> GradeResponse:
        from backend.app.core.config import settings
        from backend.app.services.resume import resume_service
        from backend.app.core.prompts import (
            ANSWER_EVALUATION_PROMPT_TEMPLATE, 
            GENERAL_ANSWER_EVALUATION_PROMPT_TEMPLATE,
            SYSTEM_PROMPT, 
            RESUME_AWARE_CONTEXT_TEMPLATE
        )
        import google.generativeai as genai
        import json

        if not settings.cleaned_gemini_api_key or "your_gemini_api_key" in settings.cleaned_gemini_api_key:
            return self._grade_mock_answer(question, answer)

        try:
            genai.configure(api_key=settings.cleaned_gemini_api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Prepare Resume Context
            resume_text = resume_service.get_current_resume_text()
            
            if resume_text:
                resume_context_str = RESUME_AWARE_CONTEXT_TEMPLATE.format(resume_text=resume_text[:15000])
                prompt = ANSWER_EVALUATION_PROMPT_TEMPLATE.format(
                    system_prompt=SYSTEM_PROMPT,
                    resume_context=resume_context_str,
                    question=question,
                    answer=answer,
                    role=role
                )
            else:
                prompt = GENERAL_ANSWER_EVALUATION_PROMPT_TEMPLATE.format(
                    system_prompt=SYSTEM_PROMPT,
                    question=question,
                    answer=answer,
                    role=role
                )
            
            # Optimize Generation config for speed
            generation_config = genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=250, # Force short grading JSON output
                response_mime_type="application/json"
            )

            response = await run_in_threadpool(model.generate_content, prompt, generation_config=generation_config)
            text = response.text.strip().replace("```json", "").replace("```", "")
            data = json.loads(text)
            return GradeResponse(**data)
            
        except Exception as e:
             print(f"DEBUG: Grading Error (using fallback): {e}")
             return self._grade_mock_answer(question, answer)

interview_service = InterviewService()
