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

it("should read the attributes of options that also hold other keys", () => {
	let evaluated = false;
	return import("./fixture.js?other-keys", {
		with: { type: "text" },
		unused: (evaluated = true)
	}).then((mod) => {
		expect(evaluated).toBe(true);
		expect(typeof mod.default).toBe("string");
		expect(mod.default).toContain("module.exports");
	});
});

it("should read an attribute value that evaluates to a string", () => {
	return import("./fixture.js?template", { with: { type: `text` } }).then(
		(mod) => {
			expect(typeof mod.default).toBe("string");
			expect(mod.default).toContain("module.exports");
		}
	);
});

it("should warn about options whose attributes are unknown at build time", () => {
	const options = { with: { type: "text" } };
	return import("./fixture.js?variable", options).then((mod) => {
		expect(mod.default).toBeDefined();
	});
});

it("should read the attributes of options given by a sequence expression", () => {
	let evaluated = false;
	return import(
		"./fixture.js?sequence",
		((evaluated = true), { with: { type: "text" } })
	).then((mod) => {
		expect(evaluated).toBe(true);
		expect(typeof mod.default).toBe("string");
		expect(mod.default).toContain("module.exports");
	});
});
