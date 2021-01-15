export function a() {}

let count = 0;

export function callme() {
	count++;
}

export function getCount() {
	return count;
}
