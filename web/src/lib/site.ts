export const site = {
  name: 'Markdeck',
  url: 'https://markdeck.pro',
  description: '把想法写下来，理清楚，讲明白。Markdeck 是为专注写作、梳理逻辑与从容展示而设计的本地 Markdown 工具。',
  repository: 'https://github.com/0xgeda/markdeck',
  releases: 'https://github.com/0xgeda/markdeck/releases',
};

// Only show a direct-download CTA after a real public asset has been configured.
function getDownloadUrl() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_MAC_DOWNLOAD_URL?.trim() ?? '');
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export const macDownloadUrl = getDownloadUrl();
