"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "minify-legacy-box-prefixes.css"),
			"utf8"
		);
		expect(css).toMatchSnapshot("minify-legacy-box-prefixes");

		expect(css).toContain(
			".clamp{-webkit-line-clamp:2;-webkit-box-orient:vertical;flex-direction:column;display:-webkit-box;"
		);
		expect(css).toContain(
			".pack{-webkit-box-pack:center;justify-content:center;display:-webkit-box}"
		);
		expect(css).toContain(
			".important{-webkit-box-align:center;align-items:center;display:-webkit-box!important;display:flex}"
		);
		expect(css).toContain(".flex{justify-content:center;display:flex}");
		expect(css).toContain(".utility{justify-content:center}");
	}
};
