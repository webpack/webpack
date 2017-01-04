"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const async = require("async");
const path = require("path");
const Tapable = require("tapable");
const ContextModule = require("./ContextModule");
const ContextElementDependency = require("./dependencies/ContextElementDependency");
class ContextModuleFactory extends Tapable {
	constructor(resolvers) {
		super();
		this.resolvers = resolvers;
	}

	create(data, callback) {
		const module = this;
		const context = data.context;
		const dependencies = data.dependencies;
		const dependency = dependencies[0];
		this.applyPluginsAsyncWaterfall("before-resolve", {
			context,
			request: dependency.request,
			recursive: dependency.recursive,
			regExp: dependency.regExp,
			async: dependency.async,
			dependencies
		}, (err, result) => {
			if(err) {
				return callback(err);
			}
			// Ignored
			if(!result) {
				return callback();
			}
			const context = result.context;
			const request = result.request;
			const recursive = result.recursive;
			const regExp = result.regExp;
			const asyncContext = result.async;
			const dependencies = result.dependencies;
			let loaders;
			let resource;
			let loadersPrefix = "";
			const idx = request.lastIndexOf("!");
			if(idx >= 0) {
				let loaderStr = request.substr(0, idx + 1);
				let i = 0;
				for(; i < loaderStr.length && loaderStr[i] === "!"; i++) {
					loadersPrefix += "!";
				}
				loaderStr = loaderStr.substr(i).replace(/!+$/, "").replace(/!!+/g, "!");
				if(loaderStr === "") {
					loaders = [];
				} else {
					loaders = loaderStr.split("!");
				}
				resource = request.substr(idx + 1);
			} else {
				loaders = [];
				resource = request;
			}
			const resolvers = module.resolvers;
			async.parallel([
				callback => {
					resolvers.context.resolve({}, context, resource, (err, result) => {
						if(err) {
							return callback(err);
						}
						callback(null, result);
					});
				},
				callback => {
					async.map(loaders, (loader, callback) => {
						resolvers.loader.resolve({}, context, loader, (err, result) => {
							if(err) {
								return callback(err, null);
							}
							callback(null, result);
						});
					}, callback);
				}
			], (err, result) => {
				if(err) {
					return callback(err);
				}
				module.applyPluginsAsyncWaterfall("after-resolve", {
					loaders: loadersPrefix + result[1].join("!") + (result[1].length > 0 ? "!" : ""),
					resource: result[0],
					recursive,
					regExp,
					async: asyncContext,
					dependencies,
					resolveDependencies: module.resolveDependencies.bind(module)
				}, (err, result) => {
					if(err) {
						return callback(err);
					}
					// Ignored
					if(!result) {
						return callback();
					}
					return callback(null, new ContextModule(result.resolveDependencies, result.resource, result.recursive, result.regExp, result.loaders, result.async));
				});
			});
		});
	}

	resolveDependencies(fs, resource, recursive, regExp, callback) {
		if(!regExp || !resource) {
			return callback(null, []);
		}
		(function addDirectory(directory, callback) {
			fs.readdir(directory, (err, files) => {
				if(err) {
					return callback(err);
				}
				if(!files || files.length === 0) {
					return callback(null, []);
				}
				async.map(files.filter(p => p.indexOf(".") !== 0), (seqment, callback) => {
					const subResource = path.join(directory, seqment);
					fs.stat(subResource, (err, stat) => {
						if(err) {
							return callback(err);
						}
						if(stat.isDirectory()) {
							if(!recursive) {
								return callback();
							}
							addDirectory.call(this, subResource, callback);
						} else if(stat.isFile()) {
							const obj = {
								context: resource,
								request: `.${subResource.substr(resource.length).replace(/\\/g, "/")}`
							};
							this.applyPluginsAsyncWaterfall("alternatives", [obj], (err, alternatives) => {
								if(err) {
									return callback(err);
								}
								const newAlternatives = alternatives
									.filter(obj => regExp.test(obj.request))
									.map(obj => {
										const dep = new ContextElementDependency(obj.request);
										dep.optional = true;
										return dep;
									});
								callback(null, newAlternatives);
							});
						} else {
							callback();
						}
					});
				}, (err, result) => {
					if(err) {
						return callback(err);
					}
					if(!result) {
						return callback(null, []);
					}
					callback(null, result.filter(i => !!i)
						.reduce((a, i) => a.concat(i), []));
				});
			});
		}).call(this, resource, callback);
	}
}
module.exports = ContextModuleFactory;
