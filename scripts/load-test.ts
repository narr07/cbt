import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

// Configuration
const BASE_URL = 'https://osnrajagaluh.vercel.app';
const CONCURRENT_USERS = 30;
const TEST_DURATION_MS = 60000; // 1 minute
const CSV_PATH = path.join(__dirname, '..', 'Template_Siswa_OSN MATEMATIKA.csv');

interface UserCredential {
    name: string;
    username: string;
    password: string;
}

async function parseCsv(): Promise<UserCredential[]> {
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n');
    const credentials: UserCredential[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, username, password] = line.split(';');
        credentials.push({ name, username, password });
    }
    return credentials;
}

async function simulateUser(credential: UserCredential, browser: Browser) {
    console.log(`[${credential.username}] Starting session...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('#username', credential.username);
        await page.fill('#password', credential.password);
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await page.waitForURL(`${BASE_URL}/student`);
        console.log(`[${credential.username}] Logged in successfully.`);

        // 2. Start Exam
        const startLink = page.getByRole('link', { name: /Mulai Ujian/i });
        await startLink.first().waitFor({ timeout: 10000 });
        await startLink.first().click();

        // 3. Confirm Start (Fullscreen dialog)
        const startConfirmButton = page.getByRole('button', { name: /Mulai Ujian Sekarang/i });
        await startConfirmButton.waitFor({ timeout: 10000 });
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
                await page.waitForTimeout(2000 + Math.random() * 3000);

                // Go to next question
                const nextButton = page.getByRole('button', { name: /Selanjutnya/i });
                if (await nextButton.isVisible() && await nextButton.isEnabled()) {
                    await nextButton.click();
                } else {
                    break;
                }
            } else {
                await page.waitForTimeout(1000);
            }
        }

        console.log(`[${credential.username}] Finished answering ${questionCount} questions.`);

        // 5. Submit Exam
        const submitButton = page.getByRole('button', { name: /Selesai/i });
        await submitButton.click();

        const confirmSubmitButton = page.getByRole('button', { name: /Ya, Kirim Sekarang/i });
        await confirmSubmitButton.waitFor({ timeout: 10000 });
        await confirmSubmitButton.click();

        console.log(`[${credential.username}] Exam submitted.`);

    } catch (error) {
        console.error(`[${credential.username}] Error:`, error);
    } finally {
        await context.close();
    }
}

async function runLoadTest() {
    console.log('--- CBT LOAD TEST STARTING ---');
    const credentials = await parseCsv();
    const testUsers = credentials.slice(0, CONCURRENT_USERS);

    const browser = await chromium.launch({ headless: true });

    console.log(`Simulating ${testUsers.length} concurrent users...`);

    const promises = testUsers.map(user => simulateUser(user, browser));

    await Promise.all(promises);

    await browser.close();
    console.log('--- CBT LOAD TEST COMPLETED ---');
}

runLoadTest().catch(console.error);
