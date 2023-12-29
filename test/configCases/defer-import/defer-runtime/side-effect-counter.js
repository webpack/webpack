let count = 0;
export function touch() {
	count++;
}
export function reset() {
	count = 0;
}
export function assertTouched() {
	if (count === 0) throw new Error("Side effect not triggered.");
	if (count > 1) throw new Error("Side effect triggered more than expected.");
}
export function assertUntouched() {
	if (count !== 0) throw new Error("Side effect triggered.");
}
