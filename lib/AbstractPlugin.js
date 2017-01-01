/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class AbstractPlugin {
	static create(plugins) {
		return class Plugin extends AbstractPlugin {
			constructor() {
				super(plugins);
			}
		};
	}

	constructor(plugins) {
		this._plugins = plugins || {};
	}

	apply(object) {
		for(const name in this._plugins) {
			object.plugin(name, this._plugins[name]);
		}
	}
}

module.exports = AbstractPlugin;
