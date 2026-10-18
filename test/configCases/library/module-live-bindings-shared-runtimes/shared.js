export { count as unusedCount, count as countAlias };
export let count = 1;
export let total = 10;

export function bump() {
	count++;
	total += 10;
}
