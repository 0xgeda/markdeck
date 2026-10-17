export const site = {
  name: 'Markdeck',
  url: 'https://markdeck.pro',
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
