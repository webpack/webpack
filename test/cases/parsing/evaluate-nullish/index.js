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

it("should keep the right operand when a side-effectful left operand is nullish", function () {
	const list = [1];
	let calls = 0;
	const fallback = "fallback";
	expect(([list] && null) ?? fallback).toBe("fallback");
	expect(((calls++, list) && null) ?? require("./dep")).toBe("dep");
	expect(calls).toBe(1);
});
