import requests
from bs4 import BeautifulSoup
import random
import time

class PDRMService:
    def __init__(self):
        self.base_url = "https://semakmule.rmp.gov.my/"
        
    async def check_account(self, account_number: str) -> dict:
        """
        Check if account number is in PDRM scam database by searching the Semak Mule portal.
        """
        try:
            # Use a session to maintain cookies/CSRF if needed
            session = requests.Session()
            
            # Step 1: Get the search page to potentially retrieve a CSRF token
            resp = session.get(self.base_url, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Try to find CSRF token (the field name is often '_token' in Laravel/PHP apps)
            csrf_token = soup.find('input', {'name': '_token'})
            token = csrf_token['value'] if csrf_token else None
            
            # Step 2: Submit the search form
            payload = {
                'type': '1',  # '1' usually corresponds to bank account check on this portal
                'value': account_number,
                '_token': token
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': self.base_url
            }
            
            resp = session.post(
                self.base_url, 
                data=payload, 
                headers=headers,
                timeout=10
            )
            
            # Step 3: Parse the results from the response HTML
            soup = BeautifulSoup(resp.text, 'html.parser')
            result_text = soup.get_text().lower()
            
            # Check for keywords indicating a match or no match
            if 'amaran' in result_text or 'laporan' in result_text or 'rekod' in result_text and 'scam' in result_text:
                return {
                    "status": "HIGH_RISK",
                    "found_in_database": True,
                    "message": "Akaun ini mempunyai rekod laporan scam di pangkalan data PDRM.",
                    "risk_score": 0.95
                }
            elif 'tiada rekod' in result_text:
                return {
                    "status": "CLEAR",
                    "found_in_database": False,
                    "message": "Tiada rekod dijumpai dalam pangkalan data PDRM.",
                    "risk_score": 0.05
                }
            else:
                # If we get here, the page structure might have changed or we got an error page
                return {
                    "status": "UNKNOWN", 
                    "found_in_database": False,
                    "message": "Could not determine status from PDRM portal response.",
                    "risk_score": 0.3
                }
                
        except Exception as e:
            # Fallback for connection errors or parsing failures
            return {
                "status": "ERROR", 
                "found_in_database": False,
                "error": str(e),
                "message": "Error connecting to PDRM portal.",
                "risk_score": 0.3
            }