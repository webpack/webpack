it("should not validate options against the schema when the check passes", () => {
	expect(require("./a")).toEqual({
		options: { name: "valid" },
		checked: [{ name: "valid" }],
		schemaRead: false
	});
});

it("should validate options against the schema when the check fails", () => {
	expect(() => require("./b")).toThrow(/options\.name should be a string/);
});

it("should trust a check that passes", () => {
	expect(require("./c")).toEqual({
		options: { name: 42 },
		checked: [{ name: 42 }],
		schemaRead: false
	});
});

it("should fall back to the schema when a stale check rejects valid options", () => {
	expect(require("./d")).toEqual({
		options: { name: "valid" },
		checked: [{ name: "valid" }],
		schemaRead: true
	});
});

it("should not call a function returning the schema when the check passes", () => {
	expect(require("./e")).toEqual({
		options: { name: "valid" },
		checked: [{ name: "valid" }],
		schemaRead: false
	});
});

it("should validate with the schema a function returns when the check fails", () => {
	expect(() => require("./f")).toThrow(/options\.name should be a string/);
});

it("should name the loader by the configuration it passes", () => {
	expect(() => require("./g")).toThrow(/Named Loader has been initialized/);
});
