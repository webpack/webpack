"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");
const DelegatedModuleFactoryPlugin = require("./DelegatedModuleFactoryPlugin");
const ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");
class DllReferencePlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
		});
		compiler.plugin("before-compile", (params, callback) => {
			const manifest = this.options.manifest;
			if(typeof manifest === "string") {
				params.compilationDependencies.push(manifest);
				compiler.inputFileSystem.readFile(manifest, (err, result) => {
					if(err) {
						return callback(err);
					}
					params[`dll reference ${manifest}`] = JSON.parse(result.toString("utf-8"));
					return callback();
				});
			} else {
				return callback();
			}
		});
		compiler.plugin("compile", (params) => {
			const optionsManifest = this.options.manifest;
			let manifest = typeof optionsManifest === "string"
				? params[`dll reference ${optionsManifest}`]
				: optionsManifest;
			const name = this.options.name || manifest.name;
			const sourceType = this.options.sourceType || "var";
			const externals = {};
			const source = `dll-reference ${name}`;
			externals[source] = name;
			params.normalModuleFactory.apply(new ExternalModuleFactoryPlugin(sourceType, externals));
			params.normalModuleFactory.apply(new DelegatedModuleFactoryPlugin({
				source,
				type: this.options.type,
				scope: this.options.scope,
				context: this.options.context || compiler.options.context,
				content: this.options.content || manifest.content,
				extensions: this.options.extensions
			}));
		});
	}
}
module.exports = DllReferencePlugin;
