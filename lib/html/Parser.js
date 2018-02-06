const posthtml = require('posthtml');
const { imports, urls } = require('@posthtml/esm');

const {
	HTMLURLDependency,
	HTMLImportDependency,
	HTMLExportDependency
} = require('./dependencies');

const { OriginalSource } = require('webpack-sources');

class HTMLParser {
	constructor (options = {}) {
		this.options = options;
	}

	parse (source, state, cb) {
		const plugins = [
			urls({
				url: true
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

				const dependencies = messages
					.filter((msg) => msg.type.includes('dependency'));

				// HACK PostHTML Bug (#250)
				messages.length = 0

				return dependencies
					.filter((msg) => {
						return msg.type.includes('import') || msg.type.includes('export')
					})
					.reduce((done, dep) => new Promise((resolve, reject) => {
						if (dep.name.includes('HTML__URL')) {
							const dependency = new HTMLURLDependency(dep.url, dep.name);

							state.module.addDependency(dependency, (err) => {
								if (err) reject(err);

								resolve();
							})
						}

						if (dep.name.includes('HTML__IMPORT')) {
							const dependency = new HTMLImportDependency(dep.import, dep.name);

							state.module.addDependency(dependency, (err) => {
								if (err) reject(err);

								resolve();
							})
						}

						if (dep.name.includes('HTML__EXPORT')) {
							const dependency = new HTMLExportDependency(dep.export(), dep.name);

							state.module.addDependency(dependency, (err) => {
								if (err) reject(err);

								resolve();
							})
						}

						resolve()
					}), Promise.resolve())
			})
			.then(() => cb(null, state))
			.catch((err) => cb(err))
	}
}

module.exports = HTMLParser;
