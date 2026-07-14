const name = Math.random() > 0.5 ? "a" : "b";
require(`./foo/${name}.js`);

it("context module regexp with `?`/`|` should produce a well-formed source name", () => {
	const fs = require("fs");
	const map = JSON.parse(fs.readFileSync(`${__filename}.map`, "utf-8"));
	// The `?` and `|` inside the regexp are percent-encoded so the name is not
	// truncated at the query separator and stays a single path segment.
	expect(map.sources).toContain(
		"webpack:///./foo/ sync [\\\\/](%3F:a%7Cb)\\.js$"
	);
});
