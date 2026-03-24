import asyncio, os, sys
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv('backend/.env')

from backend.app.services.job_aggregator import job_aggregator_service

async def test():
    res = await job_aggregator_service.aggregate_and_score_jobs('Software Engineer', 'India', ['python', 'react'])
    for j in res.jobs:
        print(f"[{j.source}] {j.title} => Link: {j.apply_link[:30]}...")

if __name__ == "__main__":
    asyncio.run(test())
