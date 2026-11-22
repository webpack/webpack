const load = (name) => import.meta;
export const url = load("a").url;
function meta(name) {
	return import.meta;
}
export const same = meta("b") === import.meta;
