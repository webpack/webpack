/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const posthtml = require("posthtml");
const { imports, urls } = require("@posthtml/esm");
const entries = require("./plugins/entries");

const {
	HTMLURLDependency,
	HTMLEntryDependency,
	HTMLImportDependency,
	HTMLExportDependency
} = require("./dependencies");

const SingleEntryPlugin = require("../SingleEntryPlugin");

const { OriginalSource } = require("webpack-sources");

const isDependency = msg => {
	return (
		msg.type.includes("import") ||
		msg.type.includes("export") ||
		msg.type.includes("entry")
	);
};

class HTMLParser {
	constructor(options = {}) {
		this.options = options;
	}

	parse(source, state, cb) {
		const plugins = [
			entries(),
			urls({
				url: /ENTRY/
			}),
			imports({
				imports: true
			})
		];

		const options = {
			to: state.module.resource,
			from: state.module.resource
		};

		posthtml(plugins)
			.process(source, options)
			.then(({ tree, html, messages }) => {
				state.module._ast = tree;
				state.module._source = new OriginalSource(html);

				const dependencies = messages.filter(isDependency);

				return dependencies.reduce(
					(done, dep) =>
						new Promise((resolve, reject) => {
							if (dep.name.includes("HTML__ENTRY")) {
								state.module.addDependency(
									new HTMLEntryDependency(dep.url, dep.name),
									err => {
										if (err) reject(err);

										resolve();
									}
								);

								const dependency = SingleEntryPlugin.createDependency(
									dep.url,
									dep.name
								);

								state.compilation.addEntry(
									state.module.context,
									dependency,
									dep.name,
									err => {
										if (err) reject(err);

										resolve();
									}
								);
							}

							if (dep.name.includes("HTML__URL")) {
								const dependency = new HTMLURLDependency(dep.url, dep.name);

								state.module.addDependency(dependency, err => {
									if (err) reject(err);

									resolve();
								});
							}

							if (dep.name.includes("HTML__IMPORT")) {
								const dependency = new HTMLImportDependency(dep.url, dep.name);

								state.module.addDependency(dependency, err => {
									if (err) reject(err);

									resolve();
								});
							}

							if (dep.name.includes("HTML__EXPORT")) {
								const dependency = new HTMLExportDependency(
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

module.exports = HTMLParser;
