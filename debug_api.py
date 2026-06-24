import httpx
import asyncio

url = "https://agentstudio.servicesessentials.ibm.com/api/v1/run/e96ee1a0-9af5-4168-b042-7bda2df7431f"
api_key = "DUMMY_KEY"

async def main():
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}
    payload = {
        "output_type": "chat",
        "input_type": "chat",
        "input_value": "test"
    }
    
    print(f"Testing URL: {url}")
    async with httpx.AsyncClient(follow_redirects=False) as client:
        resp = await client.post(url, json=payload, headers=headers)
        print(f"Initial Status: {resp.status_code}")
        print(f"Initial Headers: {resp.headers}")
        
        if resp.status_code in [301, 302, 307, 308]:
            print(f"Redirect Location: {resp.headers.get('location')}")
            
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.post(url, json=payload, headers=headers)
        print(f"\nFinal Status (Follow Redirects): {resp.status_code}")
        print(f"Final Response Text: {resp.text}")

if __name__ == "__main__":
    asyncio.run(main())
