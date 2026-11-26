export function tick(calls) {
	let value = { valueOf: () => calls.push(1) };
	value++;
}

it("loads the minified module and preserves the update coercion", () => {
	const calls = [];
	tick(calls);
	expect(calls).toEqual([1]);
});
