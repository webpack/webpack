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
const DelegatedExportsDependency = require("./dependencies/DelegatedExportsDependency");

class DelegatedModule extends Module {
	constructor(sourceRequest, data, type, userRequest, originalRequest) {
		super("javascript/dynamic", null);

		// Info from Factory
		this.sourceRequest = sourceRequest;
		this.request = data.id;
		this.type = type;
		this.userRequest = userRequest;
		this.originalRequest = originalRequest;
		this.delegateData = data;
	}

	libIdent(options) {
		return typeof this.originalRequest === "string"
			? this.originalRequest
			: this.originalRequest.libIdent(options);
	}

	identifier() {
		return `delegated ${JSON.stringify(this.request)} from ${
			this.sourceRequest
		}`;
	}

	readableIdentifier() {
		return `delegated ${this.userRequest} from ${this.sourceRequest}`;
	}

	needRebuild() {
		return false;
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.buildMeta = Object.assign({}, this.delegateData.buildMeta);
		this.buildInfo = {};
		this.addDependency(new DelegatedSourceDependency(this.sourceRequest));
		this.addDependency(
			new DelegatedExportsDependency(this, this.delegateData.exports || true)
		);
		callback();
	}

	source(depTemplates, runtime) {
		const dep = this.dependencies[0];
		const sourceModule = dep.module;
		let str;

		if (!sourceModule) {
			str = WebpackMissingModule.moduleCode(this.sourceRequest);
		} else {
			str = `module.exports = (${runtime.moduleExports({
				module: sourceModule,
				request: dep.request
			})})`;

			switch (this.type) {
				case "require":
					str += `(${JSON.stringify(this.request)})`;
					break;
				case "object":
					str += `[${JSON.stringify(this.request)}]`;
					break;
			}

			str += ";";
		}

		if (this.useSourceMap) {
			return new OriginalSource(str, this.identifier());
		} else {
			return new RawSource(str);
		}
	}

	size() {
		return 42;
	}

	updateHash(hash) {
		hash.update(this.type);
		hash.update(JSON.stringify(this.request));
		super.updateHash(hash);
	}
}

module.exports = DelegatedModule;
