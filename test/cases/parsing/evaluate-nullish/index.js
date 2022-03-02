function a() {}

it("should evaluate nullish coalescing", function () {
	expect("" ?? require("fail")).toBe("");
	expect(String.raw`aaaa` ?? require("fail")).toBe("aaaa");
	expect(a`aaaa` ?? "expected").toBe("expected");
	expect(null ?? "expected").toBe("expected");
	expect(("" ?? require("fail")) && true).toBe("");
	let x = 0;
	expect(((x = 1), null) ?? true).toBe(true);
	expect(x).toBe(1);
});
