export let count = 0;
export const label = "a";
export function increment() {
	return count++;
}
---
export let count = 10;
export const label = "b";
export function increment() {
	return (count += 2);
}
