global.__chainOrder = (global.__chainOrder || []).concat("chain-c");

export let depth = 1;

export function deepen() {
	depth += 1;
	return depth;
}
