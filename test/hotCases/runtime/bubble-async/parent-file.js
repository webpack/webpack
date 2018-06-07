export function load() {
	return import("./file").then(file => file.default);
}
