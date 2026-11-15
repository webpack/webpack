it("should keep the else branch of an if with a NaN test", () => {
	let result;
	if (0 / 0) {
		result = "then";
	} else {
		result = "else";
	}
	expect(result).toBe("else");
});

it("should pick the falsy side of a conditional with a NaN test", () => {
	expect("abc" ** -1 ? "wrong" : "right").toBe("right");
	expect("a" * false ? "wrong" : "right").toBe("right");
});

it("should fold logical operators on NaN as falsy", () => {
	expect(!(0 / 0)).toBe(true);
	expect((0 / 0) || "fallback").toBe("fallback");
	expect((0 / 0) && "wrong").toBeNaN();
});
