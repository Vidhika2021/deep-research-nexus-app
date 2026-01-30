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
import time
import re

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
        
        # Initial Request
        current_payload = {"prompt": query}
        upstream_job_id = None
        start_time = time.time()
        
        # Polling Loop against Upstream
        while True:
            # Check for timeout (e.g. 15 mins)
            if time.time() - start_time > 1200:
                raise Exception("Upstream polling timed out")

            logger.info(f"Polling upstream for job {job_id} with payload: {current_payload}")
            response = requests.post(API_URL, json=current_payload, headers=headers, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"Upstream Error: {response.text}")
                jobs[job_id] = {"status": "failed", "error": f"Upstream Error: {response.status_code}"}
                return

            # Parse Response
            try:
                data = response.json()
            except:
                # Text response -> assume final result?
                jobs[job_id] = {"status": "completed", "result": {"output_value": response.text}}
                return

            # Logic to detect if it's still processing
            # Pattern: { "response": [ { "message": "Research started. Job ID: <UUID>...", ... } ] }
            is_processing = False
            msg_text = ""
            
            # Extract message text from various JSON structures
            if isinstance(data, dict):
                if "response" in data and isinstance(data["response"], list) and len(data["response"]) > 0:
                    msg_text = data["response"][0].get("message", "")
                elif "output_value" in data:
                    msg_text = data["output_value"]
                elif "message" in data:
                    msg_text = data["message"]
            
            logger.info(f"Upstream Poll Response: {msg_text}")

            # Check for "Job ID" pattern in the INITIAL response
            import re
            match = re.search(r"Job ID:\s*([a-f0-9\-]+)", msg_text)
            
            if match:
                # Upstream says it's processing/started
                extracted_id = match.group(1)
                
                # If this is the first time, or if we are just continuing to poll
                upstream_job_id = extracted_id
                
                # Prepare payload for NEXT poll: Use 'job_id' key!
                current_payload = {"job_id": upstream_job_id}
                
                # Wait before next poll
                time.sleep(10) 
                continue # Loop again

            # Check if it says "Research in progress"
            if "Research in progress" in msg_text:
                # Still running, just wait and poll again
                # current_payload is already {"job_id": ...} from previous loop
                time.sleep(10)
                continue

            # If we get here, it's not "Started" and not "In Progress" -> It must be the Result
            jobs[job_id] = {
                "status": "completed",
                "result": data
            }
            logger.info(f"Job {job_id} completed successfully.")
            return

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
