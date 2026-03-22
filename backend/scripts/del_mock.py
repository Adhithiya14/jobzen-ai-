import os
import sys
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlmodel import Session, select
from backend.app.models.aptitude import AptitudeQuestion
from backend.app.core.db import engine

def main():
    to_delete = ['Numbers', 'HCF and LCM', 'Profit and Loss', 'Time and Work', 'Percentage', 'Average']
    retries = 5
    for attempt in range(retries):
        try:
            with Session(engine) as session:
                questions = session.exec(select(AptitudeQuestion).where(AptitudeQuestion.category.in_(to_delete))).all()
                if not questions:
                    print("No old questions found to delete.")
                    break
                for q in questions:
                    session.delete(q)
                session.commit()
                print(f"Successfully deleted {len(questions)} old mock questions.")
                break
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
