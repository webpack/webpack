// `import.meta` is a syntax error inside the `eval()` this devtool wraps a module in.
export const url = new URL("./asset.txt", import.meta.url);
// A second reference bailing for the same reason must not report it twice.
export const again = new URL("./asset.txt", import.meta.url);
