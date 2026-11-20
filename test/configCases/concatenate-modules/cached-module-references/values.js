export let value = 1;

/** @returns {void} */
export function increment() {
	value++;
}

/**
 * @this {{ value: number } | undefined}
 * @returns {number | "unbound"} the receiver's value
 */
export function receiver() {
	return this === undefined ? "unbound" : this.value;
}

export const object = { value: 3, receiver };
