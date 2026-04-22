import requests
from bs4 import BeautifulSoup
import random
import time

class PDRMService:
    def __init__(self, demo_mode: bool = True):
        self.demo_mode = demo_mode  # Toggle for finals safety
        self.base_url = "https://semakmule.rmp.gov.my/"
        
    async def check_account(self, account_number: str) -> dict:
        """
        Check if account number is in PDRM scam database
        """
        if self.demo_mode:
            return self._demo_response(account_number)
        
        return await self._scrape_pdrm(account_number)
    
    def _demo_response(self, account_number: str) -> dict:
        """
        Simulated response for hackathon demo reliability
        """
        # Deterministic "randomness" based on account number
        # Last digit odd = high risk, even = clear
        last_digit = int(account_number[-1]) if account_number.isdigit() else 0
        
        if last_digit % 2 != 0:  # Odd = scam
            return {
                "status": "HIGH_RISK",
                "found_in_database": True,
                "report_count": random.randint(3, 15),
                "last_reported": "2026-04-20",
                "message": "Akaun ini mempunyai rekod laporan scam",
                "risk_score": 0.92
            }
        else:  # Even = clear
            return {
                "status": "CLEAR",
                "found_in_database": False,
                "report_count": 0,
                "message": "Tiada rekod dijumpai",
                "risk_score": 0.05
            }
    
    async def _scrape_pdrm(self, account_number: str) -> dict:
        """
        Real scraper (use with caution - may break)
        """
        try:
            session = requests.Session()
            
            # Step 1: Get CSRF token if required
            resp = session.get(self.base_url, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Try to find CSRF token (adjust selector based on actual HTML)
            csrf_token = soup.find('input', {'name': '_token'})
            token = csrf_token['value'] if csrf_token else None
            
            # Step 2: Submit form
            payload = {
                'type': '1',  # Bank account check
                'value': account_number,
                '_token': token
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': self.base_url
            }
            
            resp = session.post(
                self.base_url, 
                data=payload, 
                headers=headers,
                timeout=10
            )
            
            # Step 3: Parse results
            soup = BeautifulSoup(resp.text, 'html.parser')
            result_text = soup.get_text().lower()
            
            if 'amaran' in result_text or 'laporan' in result_text:
                return {
                    "status": "HIGH_RISK",
                    "found_in_database": True,
                    "message": "Found in PDRM database"
                }
            elif 'tiada rekod' in result_text:
                return {
                    "status": "CLEAR",
                    "found_in_database": False,
                    "message": "No records found"
                }
            else:
                return {"status": "UNKNOWN", "error": "Could not parse response"}
                
        except Exception as e:
            return {"status": "ERROR", "error": str(e)}