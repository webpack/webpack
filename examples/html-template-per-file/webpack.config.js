"use strict";

const { Eta } = require("eta");

// Default Eta instance: standard `<% %>` tags. Used for every html module
// unless a rule overrides it.
const defaultEta = new Eta();
const defaultData = { title: "Home", heading: "Welcome" };

// A differently-configured Eta for the "special" page: custom `{{ }}` tags and
// `autoEscape` disabled (so `raw` is emitted as real markup).
const specialEta = new Eta({ tags: ["{{", "}}"], autoEscape: false });
const specialData = {
	title: "Special",
	heading: "Special page",
	raw: "<p><em>Unescaped</em> markup injected from the template data.</p>"
};

/** @type {import("webpack").Configuration} */
const config = {
	target: "web",
	entry: {
		index: "./src/index.html",
		special: "./src/special.html"
	},
	experiments: {
		html: true
	},
	module: {
		parser: {
			html: {
				// Default for every html module.
				template: (source) => defaultEta.renderString(source, defaultData)
			}
		},
		rules: [
			{
				// Per-file parser options: only `special.html` gets the
				// differently-configured Eta and its own data. `rule.parser`
				// merges over `module.parser.html`, so this `template` wins for
				// the matched file while everything else keeps the default.
				test: /special\.html$/,
				parser: {
					template: (source) => specialEta.renderString(source, specialData)
				}
			}
		]
	}
};

module.exports = config;
