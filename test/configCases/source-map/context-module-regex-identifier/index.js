const name = Math.random() > 0.5 ? "a" : "b";
require(`./modules/${name}.js`);

it("context module regex identifier should not be absolutified in source map", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename + ".map", "utf-8");
	const map = JSON.parse(source);

	// Find the context module source entry
	const contextModuleSource = map.sources.find(s => s.includes("sync"));

	// The regex pattern should remain as-is, not converted to absolute path
	// Before fix: regex like "^\./.*$" would be wrongly absolutified
	// After fix: regex patterns are preserved correctly
	expect(contextModuleSource).toEqual(
		"webpack:///./modules/ sync ^%5C.%5C%2F.*%5C.js$"
	);
});
