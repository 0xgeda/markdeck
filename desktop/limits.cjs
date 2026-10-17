// Central registry of operational limits (bytes / counts / depths).
// Why these exist: they are performance / memory / abuse guards, not user-facing settings.
// If you need to raise one, do it here so related code paths stay consistent.
const MB=1024*1024;
module.exports={
  // Single Markdown document body (loaded, edited, written atomically).
  maxDocumentBytes:10*MB,
  // Document title, logic group title, etc.
  maxTitleChars:1000,
  // Single image stored or imported.
  maxImageBytes:10*MB,
  // Base64 payload accepted by attachments.store (DataURL path).
  maxImageDataChars:5*MB,
  // Encoded img src string length (for path traversal cost).
  maxImageSrcChars:4000,
  // Image reference repair: batch total and selection count.
  maxImageBatchBytes:100*MB,
  maxImagePicks:500,
  // Document bundle (zip of markdown + referenced images).
  maxBundleBytes:100*MB,
  // Full-page export HTML (printed to PDF or saved as .html).
  maxExportHtmlBytes:30*MB,
  // Project search: per-file content read cap and total scanned budget.
  projectSearchFileBytes:1*MB,
  projectSearchBudgetBytes:40*MB,
  projectSearchMaxResults:200,
  // Image folder locator: traversal budget.
  folderScanMaxFiles:2000,
  folderScanMaxDepth:10,
  // History retention per document.
  historyMaxEntries:30,
  historyMaxTotalBytes:20*MB,
  historyMinIntervalMs:60_000
};
