/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
module.exports = class MovedToPluginWarningPlugin {
	constructor(optionName, pluginName) {
		this.optionName = optionName;
		this.pluginName = pluginName;
	}
	apply(compiler) {
		const optionName = this.optionName;
		const pluginName = this.pluginName;
		compiler.plugin("compilation", (compilation) => {
			compilation.warnings.push(new Error `webpack options:
			DEPRECATED option ${optionName} will be moved to the ${pluginName}. 
			Use this instead.
			For more info about the usage of the ${pluginName} see https://webpack.github.io/docs/list-of-plugins.html`);
		});
	}
};
