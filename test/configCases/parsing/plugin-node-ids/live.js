export let current = 0;
export const fixed = 1;
export let { declaredDefault = 3 } = {};

export function reset() {
	({ current = 2 } = {});
}
