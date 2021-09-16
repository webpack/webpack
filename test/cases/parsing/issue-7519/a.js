export let count = 1;

export function inc() {
	count++;
}

export function mult(n) {
	count *= n;
}

export const multUsed = __webpack_exports_info__.mult.used;
export const incUsed = __webpack_exports_info__.inc.used;
