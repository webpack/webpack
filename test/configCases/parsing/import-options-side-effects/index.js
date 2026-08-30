it("should evaluate the options argument of an import() with a computed request", async () => {
	const log = [];
	const request = () => {
		log.push("request");
		return "a";
	};
	const module = await import(
		`./${request()}.js`,
		(log.push("options"), undefined)
	);

	expect(module.default).toBe(42);
	expect(log).toEqual(["request", "options"]);
});

it("should evaluate the options argument of an import() with a static request", async () => {
	const log = [];
	const module = await import("./a.js", (log.push("options"), undefined));

	expect(module.default).toBe(42);
	expect(log).toEqual(["options"]);
});

it("should reject an import() whose options are not an object", async () => {
	await expect(import("./a.js", 1)).rejects.toThrow(TypeError);
	await expect(import(`./${"a"}.js`, 1)).rejects.toThrow(TypeError);
});
