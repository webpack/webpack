export let [, second, ...others] = [1, 2, 3, 4];
export let { first, ...rest } = { first: 1, extra: 2 };
export let [{ nested } = { nested: 1 }] = [];
export let [outer, [inner = () => 1]] = [0, []];
export let left = "L";
export let right = "R";
// declares nothing, so no declarator of an exported name hides in it
var [] = [];
export var linked = 1;
if (second) {
	// declared again in a block, the name links to one no statement exports
	var linked, blockOnly = 2;
}

export function update() {
	[, second, ...others] = [5, 6, 7];
	({ first, ...rest } = { first: 3, more: 4 });
	[{ nested } = { nested: 9 }] = [];
	[outer, [inner = () => 2]] = [0, []];
	// naming one binding twice, the write mirrors it once
	[outer, outer] = [7, 8];
	[left, right] = [right, left];
	linked = blockOnly;
}

export function cycle(pairs) {
	for ([left, right] of pairs) {
		// the loop's last pair stays
	}
}
