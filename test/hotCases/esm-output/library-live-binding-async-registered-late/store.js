await Promise.resolve();

export let count = 1;
export function bump() {
	return ++count;
}
---
await Promise.resolve();

export let count = 1;
export function bump() {
	return ++count;
}
---
await Promise.resolve();

export let count = 10;
export function bump() {
	return ++count;
}
