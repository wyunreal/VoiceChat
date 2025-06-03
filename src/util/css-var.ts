export const resolveCssVar = (
  cssVar: string,
  element = document.documentElement
) => {
  const match = cssVar.match(/^var\((--[^)]+)\)$/);
  if (match) {
    const variable = match[1];
    return getComputedStyle(element).getPropertyValue(variable).trim();
  }
  return cssVar;
};
