const fs = require("fs");

it("source should include debug id that matches debugId key in sourcemap", function() {
	const source = fs.readFileSync(__filename, "utf-8");
	const sourceMap = fs.readFileSync(__filename + ".map", "utf-8");
	const map = JSON.parse(sourceMap);
	expect(map.debugId).toBeDefined();
	expect(
		/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(map.debugId)
	).toBe(true);
	expect(source).toContain(`//# debugId=${map.debugId}`);
});
