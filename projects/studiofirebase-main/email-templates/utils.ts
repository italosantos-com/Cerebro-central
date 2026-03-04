type PlaceholderMap = Record<string, string>;

const SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value: string): string {
  return value.replace(SPECIAL_CHARS, '\\$&');
}

export function applyPlaceholders(template: string, replacements: PlaceholderMap): string {
  return Object.entries(replacements).reduce((acc, [placeholder, value]) => {
    if (!placeholder) {
      return acc;
    }

    const pattern = new RegExp(escapeRegExp(placeholder), 'g');
    return acc.replace(pattern, value);
  }, template);
}
