it("should treat file names in a context directory as literal names", () => {
	const context = require.context("files", false, /\.json$/);
	const keys = context.keys().sort();
	expect(keys).toEqual([
		"./a.json",
		"./b!c.json",
		"./c!=!d.json",
		"./f#g.json",
		"./h\\i.json"
	]);
	for (const key of keys) {
		expect(context(key).name).toBe(key.slice(2));
	}
});
