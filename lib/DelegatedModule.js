"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const webpackSources = require("webpack-sources");
const Module = require("./Module");
const WebpackMissingModule = require("./dependencies/WebpackMissingModule");
const DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");
class DelegatedModule extends Module {
	constructor(sourceRequest, delegateData, type, userRequest) {
		super();
		this.sourceRequest = sourceRequest;
		this.delegateData = delegateData;
		this.type = type;
		this.userRequest = userRequest;
		this.request = delegateData.id;
		this.meta = delegateData.meta;
		this.built = false;
	}

	identifier() {
		return `delegated ${JSON.stringify(this.request)} from ${this.sourceRequest}`;
	}

	readableIdentifier() {
		return `delegated ${this.userRequest} from ${this.sourceRequest}`;
	}

	needRebuild() {
		return false;
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.builtTime = new Date().getTime();
		this.usedExports = true;
		this.providedExports = this.delegateData.exports || true;
		this.dependencies.length = 0;
		this.addDependency(new DelegatedSourceDependency(this.sourceRequest));
		callback();
	}

	unbuild() {
		this.built = false;
		super.unbuild();
	}

	source() {
		const sourceModule = this.dependencies[0].module;
		let str;
		if(!sourceModule) {
			str = WebpackMissingModule.moduleCode(this.sourceRequest);
		} else {
			str = `module.exports = (__webpack_require__(${sourceModule.id}))`;
			switch(this.type) {
				case "require":
					str += `(${JSON.stringify(this.request)});`;
					break;
				case "object":
					str += `[${JSON.stringify(this.request)}];`;
					break;
			}
		}
		if(this.useSourceMap) {
			return new webpackSources.OriginalSource(str, this.identifier());
		} else {
			return new webpackSources.RawSource(str);
		}
	}

	size() {
		return 42;
	}
}
DelegatedModule.prototype.delegated = true;
module.exports = DelegatedModule;
