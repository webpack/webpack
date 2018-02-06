const { RawSource } = require('webpack-sources');

class CSSModulesTemplatePlugin {
	constructor () {
		this.plugin = 'CSSModulesTemplatePlugin';
	}

	apply(moduleTemplate) {
		const { plugin } = this;
		const { content, hash } = moduleTemplate.hooks;

		content.tap(plugin, (source, module, { chunk }) => {
			if (module.type && module.type.startsWith('css')) {
				const css = new RawSource(source);

				return css;
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

module.exports = CSSModulesTemplatePlugin;
