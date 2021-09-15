it("should evaluate nullish coalescing", function () {
	expect("" ?? require("fail")).toBe("");
	expect(null ?? "expected").toBe("expected");
	expect(("" ?? require("fail")) && true).toBe("");
	let x = 0;
	expect(((x = 1), null) ?? true).toBe(true);
	expect(x).toBe(1);
});
