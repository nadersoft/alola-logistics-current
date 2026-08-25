export function normalizeLogoUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Convert Google Drive view link to direct link
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  return url;
}
