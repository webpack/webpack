"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const dir = options.output.path;
		const css = fs.readdirSync(dir).find((f) => f.endsWith(".css"));
		// One snapshot: what the wider drop takes, and what it still declines to.
		expect(fs.readFileSync(path.join(dir, css), "utf8")).toMatchSnapshot();
	}
};
