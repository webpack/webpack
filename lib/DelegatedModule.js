/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Module = require("./Module");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const WebpackMissingModule = require("./dependencies/WebpackMissingModule");
const DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");

class DelegatedModule extends Module {
	constructor(sourceRequest, data, type, userRequest) {
		super();
		this.sourceRequest = sourceRequest;
		this.request = data.id;
		this.meta = data.meta;
		this.type = type;
		this.userRequest = userRequest;
		this.built = false;
		this.delegated = true;
		this.delegateData = data;
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
		this.builtTime = Date.now();
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
					str += `(${JSON.stringify(this.request)})`;
					break;
				case "object":
					str += `[${JSON.stringify(this.request)}]`;
					break;
			}

			str += ";";
		}

		if(this.useSourceMap) {
			return new OriginalSource(str, this.identifier());
		} else {
			return new RawSource(str);
		}
	}

	size() {
		return 42;
	}
}

module.exports = DelegatedModule;
