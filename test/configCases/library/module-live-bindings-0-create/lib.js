export let count = 0;

export function increment() {
	count++;
}

export { count as aliased };
