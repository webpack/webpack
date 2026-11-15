export const loaded = true;

export function unusedAssets() {
	return [
		1 /import.meta.resolve("./file.txt")in { a: 1 },
		1 /new URL("./file.txt", import.meta.url)in { a: 1 }
	];
}
