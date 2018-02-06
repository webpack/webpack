const { RawSource } = require('webpack-sources');

class HTMLModulesTemplatePlugin {
	constructor() {
		this.plugin = 'HTMLModulesTemplatePlugin';
	}

	apply (moduleTemplate) {
		const { content, hash } = moduleTemplate.hooks;

		content.tap(plugin, (source, module, { chunk }) => {
			if (module.type && module.type.startsWith('html')) {
				const html = new RawSource(source);

				return html;
			} else {
				return source;
			}
		});

		hash.tap(plugin, (hash) => {
			hash.update(plugin);
			hash.update('1');
		});
	}
}

module.exports = HTMLModulesTemplatePlugin;
