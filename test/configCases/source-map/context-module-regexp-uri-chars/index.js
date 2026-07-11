const name = Math.random() > 0.5 ? "brands/logo.js" : "region-flags/flag.js";
require.context(
	"./images",
	true,
	/[\\/](?:brands|region-flags)[\\/].*\.js$/
);
require(`./images/${name}`);

it("context module regexp with URI-problematic chars should not produce a malformed source map name", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename + ".map", "utf-8");
	const map = JSON.parse(source);

	const contextModuleSource = map.sources.find((s) => s.includes(" sync "));

	// Issue #16259: a context module regexp containing characters like "?"
	// (from a non-capturing group "(?:...)") or "/" and "\" used to get
	// truncated or wrongly absolutified in the emitted source map name,
	// because those characters were mistaken for a query string separator
	// or path separator. They must now be percent-encoded and the full
	// regexp must be present in the source map name.
	expect(contextModuleSource).toEqual(
		"webpack:///./images/ sync [%5C%5C%2F](%3F:brands%7Cregion-flags)[%5C%5C%2F].*%5C.js$"
	);
});
