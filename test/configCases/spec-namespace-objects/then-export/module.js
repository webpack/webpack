export let calls = 0;
export let receiver;
export let result = 123;

/**
 * @param {unknown} value the next import result
 * @returns {void}
 */
export function setResult(value) {
	result = value;
}

/**
 * @param {(value: unknown) => void} resolve the import resolution callback
 * @returns {void}
 */
export function then(resolve) {
	calls++;
	receiver = this;
	resolve(result);
}
