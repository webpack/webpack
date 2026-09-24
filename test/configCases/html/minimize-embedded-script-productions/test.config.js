"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);

		expect(page).toMatchSnapshot();
		// Each production terser was handed: a classic script, a module (only read
		// as one does its unused top-level binding go) and an event handler's body.
		expect(page).toContain(
			'<script>(()=>{if(localStorage&&window.matchMedia){const e=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=e?"dark":"light"}})();</script>'
		);
		expect(page).toContain(
			"<script type=module>import.meta.url,window.moduleRan=!0;</script>"
		);
		expect(page).toContain("onclick=if(a)return!1;b()");
		expect(page).toContain("style=color:red;margin:0");
	}
};
