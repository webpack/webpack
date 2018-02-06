/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const postcss = require("postcss");
const { imports, urls } = require("./plugins");

const {
	CSSURLDependency,
	CSSImportDependency,
	CSSExportDependency
} = require("./dependencies");

const { OriginalSource, SourceMapSource } = require("webpack-sources");

const isDependency = msg => msg.type === "dependency";

class CSSParser {
	constructor(options = {}) {
		this.postcss = options;
	}

	parse(source, state, cb) {
		const plugins = [
			urls({
				url: true
			}),
			imports({
				import: true
			})
		].concat(this.postcss.plugins || []);

		const options = Object.assign(
			{
				to: state.module.resource,
				map: {
					inline: false,
					annotation: false
				},
				from: state.module.resource
			},
			this.postcss.options
		);

		postcss(plugins)
			.process(source, options)
			.then(({ root, css, map, messages }) => {
				state.module._ast = root;
				state.module._source = map
					? new SourceMapSource(css, state.module.resource, map)
					: new OriginalSource(css, state.module.resource);

				return messages.filter(isDependency).reduce(
					(done, dep) =>
						new Promise((resolve, reject) => {
							if (dep.name.includes("CSS__URL")) {
								const dependency = new CSSURLDependency(dep.url, dep.name);

								state.module.addDependency(dependency, err => {
									if (err) reject(err);

									resolve();
								});
							}

							if (dep.name.includes("CSS__IMPORT")) {
								const dependency = new CSSImportDependency(
									dep.import,
									dep.name
								);

								state.module.addDependency(dependency, err => {
									if (err) reject(err);

									resolve();
								});
							}

							if (dep.name.includes("CSS__EXPORT")) {
								const dependency = new CSSExportDependency(
									dep.export(),
									dep.name
								);

								state.module.addDependency(dependency, err => {
									if (err) reject(err);

									resolve();
								});
							}

							resolve();
						}),
					Promise.resolve()
				);
			})
			.then(() => cb(null, state))
			.catch(err => cb(err));
	}
}

module.exports = CSSParser;
