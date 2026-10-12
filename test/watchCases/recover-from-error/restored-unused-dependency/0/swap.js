export const a = 1;
export function f() {
	return [
		new URL("./swap-a.js", import.meta.url),
		new URL("./swap-b.js", import.meta.url)
	];
}
