// `import.meta` is a syntax error inside the `eval()` this devtool wraps a module in.
export const url = new URL("./asset.txt", import.meta.url);
