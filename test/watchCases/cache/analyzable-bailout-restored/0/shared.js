// `import.meta` does not parse inside the `eval()` this devtool wraps a module in.
export const a = new URL("./asset.txt", import.meta.url);
export const b = new URL("./asset.txt", import.meta.url);
