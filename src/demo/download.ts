export function snapshotFilename(subject: string, date = new Date()): string {
  const label = subject.replace(/♡/g, 'heart').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'robot';
  return `anchor0-${label}-${date.toISOString().replace(/[:.]/g, '-')}.png`;
}

export function downloadPng(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
