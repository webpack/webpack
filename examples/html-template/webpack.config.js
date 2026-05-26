"use strict";

const { Eta } = require("eta");

const eta = new Eta();

// Data injected into the template. In a real project this might come from a
// CMS, frontmatter, a JSON file, etc.
const data = {
	title: "webpack + Eta",
	items: ["Modules", "Chunks", "Dependencies"],
	logo: "./logo.png"
};

/** @type {import("webpack").Configuration} */
const config = {
	entry: "./src/index.html",
	experiments: {
		html: true
	},
	module: {
		parser: {
			html: {
				// `template` runs before webpack parses the HTML, so the Eta
				// template is compiled to plain HTML first. URLs the template
				// emits (here `logo` and the `<script src>`) are then picked
				// up as regular webpack dependencies.
				template: (source) => eta.renderString(source, data)
			}
		}
	}
};

module.exports = config;
