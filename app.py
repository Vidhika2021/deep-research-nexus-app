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

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/research")
async def perform_research(request: ResearchRequest):
    # No API key required for this public/personal endpoint
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (DeepResearchUI)"
    }

    # Adapted payload for the Deep Research Agent
    payload = {
        "prompt": request.query
    }

    def make_request():
        # strict=False allows for potentially malformed JSON or other content types if needed, 
        # though standard requests use standard JSON encoding.
        return requests.post(API_URL, json=payload, headers=headers)

    try:
        logger.info(f"Sending request to Deep Research API: {API_URL}")
        
        response = await run_in_threadpool(make_request)
        
        logger.info(f"Upstream API Status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Upstream API Error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Upstream API Error: {response.text}")

        try:
            return response.json()
        except Exception:
             # Fallback if the response is simple text
            return {"output_value": response.text}
            
    except requests.exceptions.RequestException as exc:
        logger.error(f"Connection error: {exc}")
        raise HTTPException(status_code=500, detail=f"Connection error: {str(exc)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
