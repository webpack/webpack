function get(name) {
	return require("./" + name);
}

it("should automatically infer the index.js file", function() {
	expect(get("module")).toBe("module");
});
