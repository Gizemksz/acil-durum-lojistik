import os
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.chrome.options import Options as ChromeOptions

try:
    options = EdgeOptions()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    driver = webdriver.Edge(options=options)
except Exception:
    try:
        options = ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--disable-gpu')
        driver = webdriver.Chrome(options=options)
    except Exception as e:
        print("Could not start webdriver:", e)
        exit(1)

path = os.path.abspath('index.html').replace('\\', '/')
driver.get(f'file:///{path}')
time.sleep(2)

try:
    zoom = driver.execute_script("return window.globalMap ? window.globalMap.getZoom() : 'globalMap undefined';")
    center = driver.execute_script("return window.globalMap ? window.globalMap.getCenter() : null;")
    bounds = driver.execute_script("return window.sim ? window.sim.graph.bounds : null;")
    map_data = driver.execute_script("return window.MAP_DATA ? 'exists' : 'undefined';")
    size = driver.execute_script("return document.getElementById('map').getBoundingClientRect();")
    print(f"Zoom: {zoom}")
    print(f"Center: {center}")
    print(f"Bounds: {bounds}")
    print(f"MAP_DATA: {map_data}")
    print(f"Map Size: {size}")
except Exception as e:
    print("Error executing script:", e)

driver.quit()
