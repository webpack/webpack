it("should not validate options against the schema when the check passes", () => {
	expect(require("./a")).toEqual({
		options: { name: "valid" },
		checked: [{ name: "valid" }]
	});
});

it("should validate options against the schema when the check fails", () => {
	expect(() => require("./b")).toThrow(/options\.name should be a string/);
});

it("should trust a check that passes", () => {
	expect(require("./c")).toEqual({
		options: { name: 42 },
		checked: [{ name: 42 }]
	});
});

it("should fall back to the schema when a stale check rejects valid options", () => {
	expect(require("./d")).toEqual({
		options: { name: "valid" },
		checked: [{ name: "valid" }]
	});
});
