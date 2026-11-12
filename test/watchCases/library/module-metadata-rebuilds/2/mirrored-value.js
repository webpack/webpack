export let value = 3;
/** @returns {number} updated value */
export function read() {
	// eslint-disable-next-line no-eval
	return eval("++value");
}
