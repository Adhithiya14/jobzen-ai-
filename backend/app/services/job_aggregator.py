import os
import httpx
import logging
from typing import List, Optional
from pydantic import BaseModel, HttpUrl
from backend.app.services.resume import resume_service

logger = logging.getLogger(__name__)

class JobOutput(BaseModel):
    company: str
    title: str
    location: str
    match_score: int
    apply_link: str
    source: str

class JobAggregatorResponse(BaseModel):
    jobs: List[JobOutput]

class JobAggregatorService:
    def __init__(self):
        self.adzuna_app_id = os.getenv("ADZUNA_APP_ID")
        self.adzuna_app_key = os.getenv("ADZUNA_APP_KEY")
        self.jsearch_api_key = os.getenv("JSEARCH_API_KEY")

    async def _fetch_adzuna_jobs(self, role: str, location: Optional[str] = None) -> List[dict]:
        if not self.adzuna_app_id or not self.adzuna_app_key:
            logger.warning("Adzuna credentials missing, skipping Adzuna fetch.")
            return []

        # Example Adzuna URL:
        # https://api.adzuna.com/v1/api/jobs/in/search/1?app_id={app_id}&app_key={app_key}&what={role}&where={location}
        url = "https://api.adzuna.com/v1/api/jobs/in/search/1"
        params = {
            "app_id": self.adzuna_app_id,
            "app_key": self.adzuna_app_key,
            "what": role,
            "content-type": "application/json"
        }
        if location:
            params["where"] = location

        normalized_jobs = []
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    for job in results:
                        normalized_jobs.append({
                            "company": job.get("company", {}).get("display_name", "Unknown"),
                            "title": job.get("title", "Unknown Role"),
                            "location": job.get("location", {}).get("display_name", "Unknown Location"),
                            "description": job.get("description", ""),
                            "apply_link": job.get("redirect_url", ""),
                            "source": "Adzuna"
                        })
                else:
                    logger.error(f"Adzuna API Error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Adzuna Fetch Exception: {e}")

        return normalized_jobs

    async def _fetch_jsearch_jobs(self, role: str, location: Optional[str] = None) -> List[dict]:
        if not self.jsearch_api_key:
            logger.warning("JSearch API Key missing, skipping JSearch fetch.")
            return []

        url = "https://jsearch.p.rapidapi.com/search"
        query_str = f"{role} in {location}" if location else f"{role} in India"
        headers = {
            "X-RapidAPI-Key": self.jsearch_api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }
        params = {"query": query_str, "num_pages": "1"}

        normalized_jobs = []
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params, timeout=15.0)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("data", [])
                    for job in results:
                        normalized_jobs.append({
                            "company": job.get("employer_name", "Unknown"),
                            "title": job.get("job_title", "Unknown Role"),
                            "location": f"{job.get('job_city', '')} {job.get('job_state', '')}".strip() or "Unknown Location",
                            "description": job.get("job_description", ""),
                            "apply_link": job.get("job_apply_link", ""),
                            "source": "JSearch"
                        })
                else:
                    logger.error(f"JSearch API Error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"JSearch Fetch Exception: {e}")

        return normalized_jobs

    async def aggregate_and_score_jobs(self, role: str, location: Optional[str] = None, skills: List[str] = None) -> JobAggregatorResponse:
        skills = skills or []
        
        # 1 & 2. Fetch jobs from both APIs natively
        adzuna_jobs = await self._fetch_adzuna_jobs(role, location)
        jsearch_jobs = await self._fetch_jsearch_jobs(role, location)

        # 4. Combine results
        combined_jobs = adzuna_jobs + jsearch_jobs

        # 5. Remove duplicate jobs (company + title + location)
        seen = set()
        unique_jobs = []
        for job in combined_jobs:
            # Create a unique key (case insensitive to catch minor diffs)
            key = (job["company"].strip().lower(), job["title"].strip().lower(), job["location"].strip().lower())
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)

        # 6 & 7. Calculate match score using existing function
        scored_jobs = []
        for job in unique_jobs:
            desc = job["description"]
            # To leverage the existing function strictly:
            # We pass the JD as the "text" and the user's skills as the targets
            score, _ = resume_service._compute_ats_score(desc, skills)
            
            # If the user hasn't uploaded a resume yet (no skills provided), give heavily matched generic score
            if not skills:
                score = 85
            
            # 8. Only include jobs with match_score >= 60%
            if score >= 60:
                scored_jobs.append(JobOutput(
                    company=job["company"],
                    title=job["title"],
                    location=job["location"],
                    match_score=score,
                    apply_link=job["apply_link"],
                    source=job["source"]
                ))
        
        # 9. Sort descending by score
        scored_jobs.sort(key=lambda x: x.match_score, reverse=True)

        # 10. Return top 10-20 (We default to clamping to 20 for safety)
        return JobAggregatorResponse(jobs=scored_jobs[:20])

job_aggregator_service = JobAggregatorService()
