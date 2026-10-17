import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it('links to the release page when no installer is configured', async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_MAC_DOWNLOAD_URL', '');
  const { default: DownloadPage } = await import('./page');
  render(<DownloadPage />);
  expect(screen.getByRole('link', { name: '查看 GitHub 发布页' })).toHaveAttribute('href', 'https://github.com/0xgeda/markdeck/releases');
  expect(screen.queryByRole('link', { name: '下载 Mac 版' })).not.toBeInTheDocument();
});

it('uses the configured HTTPS installer without inventing a release URL', async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_MAC_DOWNLOAD_URL', 'https://example.com/Markdeck-arm64.zip');
  const { default: DownloadPage } = await import('./page');
  render(<DownloadPage />);
  expect(screen.getByRole('link', { name: '下载 Mac 版' })).toHaveAttribute('href', 'https://example.com/Markdeck-arm64.zip');
});
