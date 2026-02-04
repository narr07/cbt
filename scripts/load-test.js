const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://osnrajagaluh.vercel.app';
const CONCURRENT_USERS = 30;
const TEST_DURATION_MS = 600000; // 10 minutes for full exam simulation
const CSV_PATH = path.join(__dirname, '..', 'Template_Siswa_OSN MATEMATIKA.csv');

async function parseCsv() {
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n');
    const credentials = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, username, password] = line.split(';');
        credentials.push({ name, username, password });
    }
    return credentials;
}

async function simulateUser(credential, browser, index) {
    // Stagger start to avoid initial request burst
    await new Promise(resolve => setTimeout(resolve, index * 2000));

    console.log(`[${credential.username}] Starting session...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Login
        await page.goto(`${BASE_URL}/login`, { timeout: 60000 });
        await page.fill('#username', credential.username);
        await page.fill('#password', credential.password);
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await page.waitForURL(`${BASE_URL}/student`, { timeout: 60000 });
        console.log(`[${credential.username}] Logged in successfully.`);

        // 2. Start Exam
        const startLink = page.getByRole('link', { name: /Mulai Ujian/i });
        await startLink.first().waitFor({ timeout: 30000 });
        await startLink.first().click();

        // 3. Confirm Start (Fullscreen dialog)
        const startConfirmButton = page.getByRole('button', { name: /Mulai Ujian Sekarang/i });
        await startConfirmButton.waitFor({ timeout: 30000 });
        await startConfirmButton.click();

        console.log(`[${credential.username}] Started exam.`);

        // 4. Simulate answering questions
        const startTime = Date.now();
        let questionCount = 0;

        while (Date.now() - startTime < TEST_DURATION_MS) {
            const options = page.locator('button.group');
            const count = await options.count();

            if (count > 0) {
                // Pick a random option
                const randomIndex = Math.floor(Math.random() * count);
                await options.nth(randomIndex).click();
                questionCount++;

                // Realistic thinking/delay
                await page.waitForTimeout(4000 + Math.random() * 4000);

                // Go to next question
                const nextButton = page.getByRole('button', { name: /Selanjutnya|Next/i });
                if (await nextButton.isVisible() && await nextButton.isEnabled()) {
                    await nextButton.click();
                } else {
                    // No more questions or end of exam
                    console.log(`[${credential.username}] Reached end of exam question list.`);
                    break;
                }
            } else {
                // Check if we are still on the take page
                if (!page.url().includes('/take')) {
                    break;
                }
                await page.waitForTimeout(2000);
            }
        }

        console.log(`[${credential.username}] Finished answering ${questionCount} questions.`);

        // 5. Submit Exam
        const submitButton = page.getByRole('button', { name: /Selesai/i });
        await submitButton.waitFor({ timeout: 10000 });
        await submitButton.click();

        const confirmSubmitButton = page.getByRole('button', { name: /Ya, Kirim Sekarang/i });
        await confirmSubmitButton.waitFor({ timeout: 10000 });
        await confirmSubmitButton.click();

        console.log(`[${credential.username}] Exam submitted.`);

        // 6. Navigate back to dashboard and LOGOUT
        // After submission, it usually redirects to /student or stay on a result page
        await page.waitForTimeout(3000);
        if (!page.url().endsWith('/student')) {
            await page.goto(`${BASE_URL}/student`, { timeout: 30000 });
        }

        const logoutButton = page.locator('button:has(svg.lucide-log-out)');
        await logoutButton.waitFor({ timeout: 15000 });
        await logoutButton.click();

        await page.waitForURL(`${BASE_URL}/login`, { timeout: 15000 });
        console.log(`[${credential.username}] Logged out successfully.`);

    } catch (error) {
        console.error(`[${credential.username}] Error:`, error.message);
    } finally {
        await context.close();
    }
}

async function runLoadTest() {
    console.log('--- CBT LOAD TEST ROUND 2 STARTING ---');
    const credentials = await parseCsv();
    const testUsers = credentials.slice(0, CONCURRENT_USERS);

    const browser = await chromium.launch({ headless: true });

    console.log(`Simulating ${testUsers.length} concurrent users with 2s interval...`);

    const promises = testUsers.map((user, index) => simulateUser(user, browser, index));

    await Promise.all(promises);

    await browser.close();
    console.log('--- CBT LOAD TEST ROUND 2 COMPLETED ---');
}

runLoadTest().catch(console.error);
