await Promise.resolve();

export let count = 1,
	hidden = 0;

export function bump() {
	count++;
	hidden++;
	return hidden;
}
