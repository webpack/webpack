const fs = require("fs");

it("source should include only debugId comment", function() {
	const debugIdRegex = new RegExp('[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', 'i');
	const debugIdCommentRegex = new RegExp(`\n\/\/# debugId\s*=\s*${debugIdRegex.source}$`);

	const source = fs.readFileSync(__filename, "utf-8");
	expect(debugIdCommentRegex.test(source)).toBe(true);

	const sourceMap = fs.readFileSync(__filename + ".map", "utf-8");
	const map = JSON.parse(sourceMap);
	expect(map.debugId).toBeDefined();
	expect(debugIdRegex.test(map.debugId)).toBe(true);
});
