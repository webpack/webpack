export const a = 1;
export function f() {
	return [
		new URL("./url-dep.js", import.meta.url),
		new URL("./url-kept.js", import.meta.url)
	];
}
