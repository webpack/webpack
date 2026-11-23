globalThis.crossChunkInitEffects.push("declarations");

// a function declaration stays at the top level, so it runs before its line
export const early = hoisted();

export function hoisted() {
	return "hoisted";
}

// no semicolon: the next declaration must not continue this one
export let count = 0
export const increment = () => ++count;

export class Point {
	constructor(x) {
		this.x = x;
	}

	get double() {
		return new Point(this.x * 2);
	}
}

// a class or function declaration ends its statement without a semicolon
let separated = 0
export class Empty {}
[1, 2].forEach((n) => {
	separated += n;
})
export function last() {
	return "last";
}
[3].forEach((n) => {
	separated += n;
});
export { separated };

export const {
	a,
	b: [c]
} = { a: "a", b: ["c"] };

let total = 0;
for (var index = 0; index < 3; index++) total += index;

if (globalThis.crossChunkInitEffects) {
	// a block's `const` stays in the block, its `var` reaches the module scope
	const suffix = "ed";
	var nested = `nest${suffix}`;
}

for (var key in { only: 1 }) total += key.length;

export { index, total, nested, key };
