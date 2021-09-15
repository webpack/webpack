import b from "./b";

it("should parse dynamic property names", function() {
	var o = {
		[require("./a")]: "a",
		[b]: "b"
	};
	expect(o).toEqual({
		a: "a",
		b: "b"
	});
});

it("should match dynamic property names", function() {
	const {
		[require("./a")]: aa,
		[b]: bb
	} = { a: "a", b: "b" };
	const [x,, ...[{
		[b]: {
			[b]: cc
		}
	}]] = [0, 1, {b: {b: "c"}}];
	expect(aa).toBe("a");
	expect(bb).toBe("b");
	expect(cc).toBe("c");
});
