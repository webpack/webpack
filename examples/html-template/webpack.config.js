"use strict";

const path = require("path");
const { Eta } = require("eta");

// `views` lets templates `include()` partials from ./src. `cache: false` keeps
// Eta reading the partials on every render, so the dependency capture below
// stays reliable across rebuilds.
const eta = new Eta({ views: path.resolve(__dirname, "src"), cache: false });

// Data injected into the template. In a real project this might come from a
// CMS, frontmatter, a JSON file, etc.
const data = {
	title: "webpack + Eta",
	items: ["Modules", "Chunks", "Dependencies"],
	logo: "./logo.png",
	year: "2025"
};

/**
 * Renders the template while recording every partial Eta reads (by wrapping
 * `eta.readFile`), then registers those files as build dependencies so editing
 * a partial like `footer.eta` triggers a rebuild and invalidates the cache.
 * @param {string} source template source
 * @param {(dependency: string) => void} addDependency register a build dependency
 * @returns {string} rendered html
 */
function renderWithDeps(source, addDependency) {
	const readFile = eta.readFile;
	/** @type {Set<string>} */
	const files = new Set();
	eta.readFile = (file) => {
		files.add(file);
		return readFile.call(eta, file);
	};
	try {
		return eta.renderString(source, data);
	} finally {
		eta.readFile = readFile;
		for (const file of files) addDependency(file);
	}
}

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
				// template (including its `include`d partials) is compiled to
				// plain HTML first. URLs the template emits (here `logo` and the
				// `<script src>`) are then picked up as regular webpack
				// dependencies.
				template: (source, { addDependency }) =>
					renderWithDeps(source, addDependency)
			}
		}
	}
};

module.exports = config;
