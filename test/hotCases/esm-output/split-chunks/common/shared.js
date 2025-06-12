export function commonFunction(input) {
	return `Common function processed: ${input}`;
}

export const commonData = {
	shared: true
};
---
export function commonFunction(input) {
	return `Updated common function: ${input}`;
}

export const commonData = {
	shared: true,
	updated: true
};
