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
