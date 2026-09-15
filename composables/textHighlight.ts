export interface TextHighlightSegment {
  text: string;
  matched: boolean;
}

/** Splits `text` so each occurrence of `query` can be rendered as a highlight. */
export function highlightQuerySegments(text: string, query: string): TextHighlightSegment[] {
  const needle = query.trim();
  if (!text) return [];
  if (!needle) return [{ text, matched: false }];

  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const segments: TextHighlightSegment[] = [];
  let cursor = 0;
  let index = lowerText.indexOf(lowerNeedle);

  while (index !== -1) {
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), matched: false });
    }
    const end = index + needle.length;
    segments.push({ text: text.slice(index, end), matched: true });
    cursor = end;
    index = lowerText.indexOf(lowerNeedle, cursor);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments;
}
