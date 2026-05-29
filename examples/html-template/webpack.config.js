"use strict";

const path = require("path");
const { Eta } = require("eta");

// Default Eta: standard `<% %>` tags, can `include()` partials from ./src.
// `cache: false` keeps partials being read on every render so the dependency
// capture in `renderWithDeps` stays reliable across rebuilds.
const eta = new Eta({ views: path.resolve(__dirname, "src"), cache: false });
const data = {
	title: "webpack + Eta",
	items: ["Modules", "Chunks", "Dependencies"],
	logo: "./logo.png",
	year: "2025"
};

// A differently-configured Eta for the "special" page: custom `{{ }}` tags and
// `autoEscape` disabled (so `raw` is emitted as real markup). Wired to a single
// file through `module.rules` below.
const specialEta = new Eta({ tags: ["{{", "}}"], autoEscape: false });
const specialData = {
	title: "Special",
	heading: "Special page",
	raw: "<p><em>Unescaped</em> markup injected from the template data.</p>"
};

/**
 * Renders with the default Eta while recording every partial Eta reads (by
 * wrapping `eta.readFile`), then registers those files via `addDependency` so
 * editing a partial like `footer.eta` triggers a rebuild and invalidates the
 * cache — even though the partial never becomes a webpack module.
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
	entry: {
		// HTML entry points only — no JavaScript entry.
		index: "./src/index.html",
		special: "./src/special.html"
	},
	experiments: {
		html: true
	},
	module: {
		parser: {
			html: {
				// Default for every html module: render with Eta and track the
				// partials it includes.
				template: (source, { addDependency }) =>
					renderWithDeps(source, addDependency)
			}
		},
		rules: [
			{
				// Per-file parser options: only `special.html` gets the
				// differently-configured Eta and its own data. `rule.parser`
				// merges over `module.parser.html`, so this `template` wins for
				// the matched file while `index.html` keeps the default.
				test: /special\.html$/,
				parser: {
					template: (/** @type {string} */ source) =>
						specialEta.renderString(source, specialData)
				}
			}
		]
	}
};

module.exports = config;
