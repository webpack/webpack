"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);
		expect(css).toMatchSnapshot();

		// A name shorter than its hex keeps the name; one longer takes the hex,
		// and three digits where the pairs repeat.
		expect(css).toContain("color:red");
		expect(css).toContain("color:#639");
		expect(css).toContain("color:#ffebcd");
		expect(css).toContain("color:#a9a9a9");
		// `transparent` is the one keyword that is a colour with an alpha.
		expect(css).toContain("color:#0000");
		// A system colour names what the engine resolves, so nothing replaces it.
		expect(css).toContain("color:activeborder");
		expect(css).toContain("color:canvas");
		// Nothing in the system group takes a hex.
		expect(css).not.toMatch(/\.s\d+[^}]*color:#/);
	}
};
