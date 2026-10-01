export function toWhatsAppFormatting(text: string): string {
  return text
    .replace(/\*{2,}([^*\n]+?)\*{2,}/g, '*$1*')
    .replace(/__(.+?)__/g, '_$1_')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .trim();
}
