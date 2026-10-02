const URL_PATTERN = /https?:\/\/[^\s<>()*"']+/g;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

export function extractUrls(text: string): string[] {
  return (text.match(URL_PATTERN) ?? []).map((url) =>
    url.replace(TRAILING_PUNCTUATION, ''),
  );
}

export function findUngroundedUrls(reply: string, facts: string): string[] {
  return [...new Set(extractUrls(reply).filter((url) => !facts.includes(url)))];
}
