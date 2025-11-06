export function getCssVar(name: string, fallback: string): string {
  // Get the value from the root element
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    name,
  );
  return value.trim() || fallback;
}
