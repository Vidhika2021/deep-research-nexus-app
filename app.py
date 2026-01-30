import os
import uuid
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Configuration
# Configuration
API_URL = "https://deep-research-api-mrqq.onrender.com/deep-research"

class ResearchRequest(BaseModel):
    query: str

from fastapi import BackgroundTasks

# Store jobs in memory (Use Redis/DB for production)
jobs = {}

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

def process_research_background(job_id: str, query: str):
    """Background task to run the research and update job status."""
    try:
        jobs[job_id]["status"] = "processing"
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (DeepResearchUI)"
        }
        
        payload = {"prompt": query}
        
        logger.info(f"Starting background research for job {job_id}")
        # Increase timeout or allow indefinite waiting if compatible with server limits
        # Note: Render might still timeout the *connection* after 100s, 
        # but this thread will keep running if the upstream doesn't cut it.
        response = requests.post(API_URL, json=payload, headers=headers, timeout=1200) 
        
        if response.status_code != 200:
            logger.error(f"Job {job_id} failed: {response.text}")
            jobs[job_id] = {
                "status": "failed", 
                "error": f"Upstream Error ({response.status_code}): {response.text}"
            }
            return

        # Success - Parse result
        try:
            result = response.json()
        except Exception:
            result = {"output_value": response.text}
            
        jobs[job_id] = {
            "status": "completed",
            "result": result
        }
        logger.info(f"Job {job_id} completed successfully.")

    except Exception as e:
        logger.error(f"Job {job_id} exception: {str(e)}")
        jobs[job_id] = {"status": "failed", "error": str(e)}

@app.post("/api/research")
async def perform_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    # Initialize job
    jobs[job_id] = {
        "status": "queued",
        "query": request.query,
        "submitted_at": str(uuid.uuid4()) # timestamp would be better but keeping deps simple
    }
    
    # Start background task
    background_tasks.add_task(process_research_background, job_id, request.query)
    
    return {"job_id": job_id, "message": "Research started in background"}

@app.get("/api/research/{job_id}")
async def get_research_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
