it("should read a quoted `with` key of import() options", () => {
	return import("./fixture.js", { "with": { type: "text" } }).then((mod) => {
		expect(typeof mod.default).toBe("string");
		expect(mod.default).toContain("module.exports");
	});
});

it("should read a `with` key that is not the first property", () => {
	return import("./fixture.js?second", {
		assert: { type: "json" },
		with: { type: "text" }
	}).then((mod) => {
		expect(typeof mod.default).toBe("string");
		expect(mod.default).toContain("module.exports");
	});
});
