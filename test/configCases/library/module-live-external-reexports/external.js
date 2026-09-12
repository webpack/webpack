export let counter = 0;
export { counter as default };

/** @returns {void} */
export function increment() {
	counter++;
}
