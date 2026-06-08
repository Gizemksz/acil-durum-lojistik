const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("Starting Browser AI Testing Agent...");
    
    // Ensure screenshots dir exists
    const ssDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(ssDir)){
        fs.mkdirSync(ssDir);
    }

    const browser = await puppeteer.launch({ 
        headless: "new",
        defaultViewport: { width: 1440, height: 900 }
    });
    const page = await browser.newPage();

    // The index.html is assumed to be served locally or accessed via file URI
    const indexUrl = `file://${path.resolve(__dirname, '../index.html')}`;
    console.log(`Navigating to ${indexUrl}`);
    
    await page.goto(indexUrl, { waitUntil: 'networkidle2' });

    console.log("Taking initial screenshot...");
    await page.screenshot({ path: path.join(ssDir, '01_initial.png') });

    // Try starting the simulation
    console.log("Clicking Start Simulation...");
    await page.waitForSelector('#btn-start-sim');
    await page.click('#btn-start-sim');
    
    // Wait for simulation to run a bit
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Taking simulation started screenshot...");
    await page.screenshot({ path: path.join(ssDir, '02_sim_started.png') });

    // Open emergency popup
    console.log("Opening new emergency popup...");
    await page.waitForSelector('#btn-new-emergency');
    await page.click('#btn-new-emergency');
    
    await new Promise(r => setTimeout(r, 500));
    console.log("Taking popup screenshot...");
    await page.screenshot({ path: path.join(ssDir, '03_emergency_popup.png') });

    // Dispatch emergency
    console.log("Dispatching emergency...");
    await page.waitForSelector('#btn-dispatch-emergency');
    await page.click('#btn-dispatch-emergency');
    
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ssDir, '04_dispatched.png') });
    
    // Test weather toggle
    console.log("Testing weather condition toggle...");
    await page.waitForSelector('#btn-weather');
    await page.click('#btn-weather');
    
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ssDir, '05_weather_active.png') });

    console.log("Test suite completed successfully. Check screenshots folder.");
    await browser.close();
})();
