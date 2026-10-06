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

		expect(css).toContain(
			".clamp{display:-webkit-box;-webkit-box-orient:vertical;flex-direction:column;"
		);
		expect(css).toContain(".pack{display:-webkit-box;-webkit-box-pack:center;");
		expect(css).toContain(
			".important{display:-webkit-box!important;display:flex;-webkit-box-align:center;"
		);
		expect(css).toContain(".flex{display:flex;justify-content:center}");
		expect(css).toContain(".utility{justify-content:center}");
	}
};
