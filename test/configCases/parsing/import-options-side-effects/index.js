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

it("should reject a computed-request import() whose options are not an object", async () => {
	await expect(import(`./${"a"}.js`, 1)).rejects.toThrow(TypeError);
});

it("should evaluate an options object whose keys are not import attributes", async () => {
	const log = [];
	const effect = () => {
		log.push("effect");
		return 1;
	};
	const module = await import("./a.js", { unused: effect() });

	expect(module.default).toBe(42);
	expect(log).toEqual(["effect"]);
});

it("should reject an import() whose options are not an object", async () => {
	await expect(import("./a.js", 1)).rejects.toThrow(
		"The second argument to import() must be an object"
	);
	await expect(import("./a.js", null)).rejects.toThrow(
		"The second argument to import() must be an object"
	);
});

it("should reject an import() whose 'with' option is not an object", async () => {
	await expect(import("./a.js", { with: 1 })).rejects.toThrow(
		"The 'with' option must be an object"
	);
});

it("should reject an import() whose attribute values are not strings", async () => {
	await expect(import("./a.js", { with: { type: 1 } })).rejects.toThrow(
		"Import attribute values must be strings"
	);
	const name = "a";
	await expect(
		import(`./${name}.js`, { with: { type: 1 } })
	).rejects.toThrow("Import attribute values must be strings");
});
