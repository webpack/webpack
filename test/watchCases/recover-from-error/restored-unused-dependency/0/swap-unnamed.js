export const b = 1;
export function f() {
	return [
		new URL("./swap-c.js", import.meta.url),
		new URL("./swap-d.js", import.meta.url)
	];
}
