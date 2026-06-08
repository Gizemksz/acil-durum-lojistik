import os
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.chrome.options import Options as ChromeOptions

try:
    options = EdgeOptions()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1280,720')
    driver = webdriver.Edge(options=options)
except Exception:
    try:
        options = ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1280,720')
        driver = webdriver.Chrome(options=options)
    except Exception as e:
        print("Could not start webdriver:", e)
        exit(1)

path = os.path.abspath('index.html').replace('\\', '/')
driver.get(f'file:///{path}')
time.sleep(3)

driver.save_screenshot('screenshot.png')
print("Screenshot saved to screenshot.png")

driver.quit()
