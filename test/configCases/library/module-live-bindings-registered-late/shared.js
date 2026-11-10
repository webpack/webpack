export {
	shared as unusedAlias,
	shared as firstAlias,
	shared as secondAlias
};
// Nothing imports `hidden`, so its setter has no used export to start from
export let shared = 1,
	hidden = 0;
export function bump() {
	shared++;
	hidden++;
	return hidden;
}
