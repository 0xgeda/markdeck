export const site = {
  name: 'Markdeck',
  url: 'https://www.markdeck.pro',
  repository: 'https://github.com/0xgeda/markdeck',
  releases: 'https://github.com/0xgeda/markdeck/releases',
};

// Update together only after the public release and asset have been verified.
export const macRelease = {
  version: '1.0.0 Preview 1',
  minimumOS: '13.0',
  sizeMB: 131,
  url: `${site.releases}/tag/v1.0.0-preview.1`,
  downloadUrl: `${site.releases}/download/v1.0.0-preview.1/Markdeck-1.0.0-preview.1-macos-arm64.zip`,
  checksumUrl: `${site.releases}/download/v1.0.0-preview.1/SHA256SUMS.txt`,
};
