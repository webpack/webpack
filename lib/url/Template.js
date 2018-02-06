const { RawSource } = require('webpack-sources');

class URLModulesTemplatePlugin {
	constructor () {
		this.plugin = "URLModulesTemplatePlugin";
	}

	apply(moduleTemplate) {
		const { plugin } = this;
		const { content, hash } = moduleTemplate.hooks;

		content.tap(plugin, (source, module, { chunk }) => {
			if (module.type && module.type.startsWith('url')) {
				const url = new RawSource(source);

				return url;
			} else {
				return source;
			}
		})

		hash.tap(plugin, (hash) => {
			hash.update(plugin);
			hash.update('1');
		})
	}
}

module.exports = URLModulesTemplatePlugin;
