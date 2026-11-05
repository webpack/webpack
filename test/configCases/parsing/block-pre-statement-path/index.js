let seen = 0;

{
	const inner = 1;
	seen = inner;
}

it("should declare a block's bindings with a blockPreStatement tap", () => {
	expect(seen).toBe(1);
});
