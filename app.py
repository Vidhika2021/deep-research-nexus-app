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
API_URL = "https://agentstudio.servicesessentials.ibm.com/api/v1/run/e96ee1a0-9af5-4168-b042-7bda2df7431f"

class ResearchRequest(BaseModel):
    query: str

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/research")
async def perform_research(request: ResearchRequest):
    api_key = os.environ.get("AGENTS_API_KEY")
    
    if not api_key:
        logger.error("AGENTS_API_KEY environment variable not set")
        raise HTTPException(status_code=500, detail="Server configuration error: API Key missing")

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "output_type": "chat",
        "input_type": "chat",
        "input_value": request.query,
        "session_id": str(uuid.uuid4())
    }

    def make_request():
        # Use requests to match user's working snippet exactly
        # Requests automatically handles cookies/headers on redirect better in some cases
        return requests.post(API_URL, json=payload, headers=headers)

    try:
        logger.info(f"Sending request to IBM Agent API for query: {request.query}")
        
        # Run synchronous requests in a separate thread to not block the event loop
        response = await run_in_threadpool(make_request)
        
        logger.info(f"Upstream API Status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Upstream API Error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Upstream API Error: {response.text}")

        try:
            return response.json()
        except Exception:
            # If response is not JSON (e.g. HTML login page), return text as error
            logger.error(f"Invalid JSON response: {response.text[:200]}")
            raise HTTPException(status_code=500, detail=f"Invalid API Response (Not JSON). content: {response.text[:200]}")
            
    except requests.exceptions.RequestException as exc:
        logger.error(f"Connection error: {exc}")
        raise HTTPException(status_code=500, detail=f"Connection error: {str(exc)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
