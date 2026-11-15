it("should keep an unresolved eager glob entry inside its comment", () => {
	const modules = import.meta.glob("/files/**/*.js", {
		eager: true,
		import: "default"
	});
	expect(Object.keys(modules)).toEqual(["/files/x*/a.js", "/files/x*/b?c.js"]);
	expect(modules["/files/x*/a.js"]).toBe(1);
	expect(modules["/files/x*/b?c.js"]).toBeUndefined();
});
