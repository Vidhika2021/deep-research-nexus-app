import time
import requests
import sys

# Default to local, but can be changed to your Render URL
BASE_URL = "http://127.0.0.1:8000" 
# BASE_URL = "https://your-app-name.onrender.com"

def test_polling():
    print(f"Testing against: {BASE_URL}")
    
    # 1. Start Research
    print("1. Initiating research...")
    try:
        resp = requests.post(f"{BASE_URL}/api/research", json={"query": "test polling"})
        if resp.status_code != 200:
            print(f"Failed to start: {resp.text}")
            return
            
        data = resp.json()
        job_id = data.get("job_id")
        print(f"   Job started! ID: {job_id}")
        
    except Exception as e:
        print(f"Error connecting: {e}")
        return

    # 2. Poll
    print("2. Polling for results...")
    start_time = time.time()
    
    while True:
        try:
            status_resp = requests.get(f"{BASE_URL}/api/research/{job_id}")
            if status_resp.status_code != 200:
                print(f"   Error checking status: {status_resp.status_code}")
                time.sleep(3)
                continue
                
            job = status_resp.json()
            status = job.get("status")
            elapsed = int(time.time() - start_time)
            
            print(f"   [{elapsed}s] Status: {status}")
            
            if status == "completed":
                print("\nSUCCESS! Research completed.")
                print("-" * 20)
                # Print first 200 chars of result
                result_text = str(job.get("result", {}))
                print(f"Result snippet: {result_text[:200]}...")
                break
                
            if status == "failed":
                print(f"\nFAILED! Error: {job.get('error')}")
                break
                
            time.sleep(3)
            
        except KeyboardInterrupt:
            print("\nStopped by user.")
            break
        except Exception as e:
            print(f"Polling error: {e}")
            break

if __name__ == "__main__":
    test_polling()
