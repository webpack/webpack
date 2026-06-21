let count = 0;
export function touch() {
	count++;
}
export function assertTouched() {
	if (count === 0) throw new Error("Side effect not triggered.");
}
export function assertUntouched() {
	if (count !== 0) throw new Error("Side effect triggered.");
}
