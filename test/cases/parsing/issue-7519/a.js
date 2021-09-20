export let count = 1;

export function inc() {
	count++;
}

export function incTruthy() {
	count++;
	return true;
}

export function mult(n) {
	count *= n;
}

export function setCount(c) {
	count = c;
}

export const multUsed = __webpack_exports_info__.mult.used;
