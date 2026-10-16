export let count = 0;
export function increment() {
	return count++;
}
---
export let count = 10;
export function increment() {
	return count++;
}
