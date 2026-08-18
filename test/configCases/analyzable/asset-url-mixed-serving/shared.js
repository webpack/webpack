// Reached synchronously from one entry and asynchronously from the other, so it sits
// in a chunk the host loads and in one webpack loads through the public path.
export const url = new URL("./asset.txt", import.meta.url);
