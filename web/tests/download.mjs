// Exercises the real public ZIP download from the website in a clean browser.
// Downloads about 131 MB to an isolated temporary directory.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const base = process.env.MARKDECK_WEB_URL || 'https://www.markdeck.pro';
const output = await mkdtemp(path.join(os.tmpdir(), 'markdeck-download-'));
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
try {
  const page = await browser.newPage({ acceptDownloads: true, locale: 'zh-CN' });
  await page.goto(`${base}/zh/download`);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('.download-primary').click(),
  ]);
  assert.equal(download.suggestedFilename(), 'Markdeck-1.0.0-preview.1-macos-arm64.zip');
  const file = path.join(output, download.suggestedFilename());
  await download.saveAs(file);
  assert.equal(await download.failure(), null);
  assert.equal((await stat(file)).size, 131409186);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  assert.equal(hash.digest('hex'), 'fdc23e5461106316851259d49de022f2b3f684465a101fe98d4ec85193c5d3db');
  console.log('PASS: website button downloads the complete public ZIP without login; filename, size and SHA-256 match the verified release.');
} finally {
  await browser.close();
  console.log('Evidence:', output);
}
