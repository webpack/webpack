"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const path = require("path");
const Tapable = require("tapable");
const Compilation = require("./Compilation");
const NormalModuleFactory = require("./NormalModuleFactory");
const ContextModuleFactory = require("./ContextModuleFactory");
class Watching {
	constructor(compiler, watchOptions, handler) {
		this.compiler = compiler;
		this.startTime = null;
		this.invalid = false;
		this.error = null;
		this.stats = null;
		this.handler = handler;
		if(typeof watchOptions === "number") {
			this.watchOptions = {
				aggregateTimeout: watchOptions
			};
		} else if(watchOptions && typeof watchOptions === "object") {
			this.watchOptions = Object.assign({}, watchOptions);
		} else {
			this.watchOptions = {};
		}
		this.watchOptions.aggregateTimeout = this.watchOptions.aggregateTimeout || 200;
		this.running = true;
		this.compiler.readRecords((err) => {
			if(err) {
				return this._done(err);
			}
			this._go();
		});
	}

	_go() {
		this.startTime = new Date().getTime();
		this.running = true;
		this.invalid = false;
		this.compiler.applyPluginsAsync("watch-run", this, (err) => {
			if(err) {
				return this._done(err);
			}
			const onCompiled = (err, compilation) => {
				if(err) {
					return this._done(err);
				}
				if(this.invalid) {
					return this._done();
				}
				if(this.compiler.applyPluginsBailResult("should-emit", compilation) === false) {
					return this._done(null, compilation);
				}
				this.compiler.emitAssets(compilation, err => {
					if(err) {
						return this._done(err);
					}
					if(this.invalid) {
						return this._done();
					}
					this.compiler.emitRecords(err => {
						if(err) {
							return this._done(err);
						}
						if(compilation.applyPluginsBailResult("need-additional-pass")) {
							compilation.needAdditionalPass = true;
							const stats = compilation.getStats();
							stats.startTime = this.startTime;
							stats.endTime = new Date().getTime();
							this.compiler.applyPlugins("done", stats);
							this.compiler.applyPluginsAsync("additional-pass", (err) => {
								if(err) {
									return this._done(err);
								}
								this.compiler.compile(onCompiled);
							});
							return;
						}
						return this._done(null, compilation);
					});
				});
			};
			this.compiler.compile(onCompiled);
		});
	}

	_done(err, compilation) {
		this.running = false;
		if(this.invalid) {
			return this._go();
		}
		this.error = err || null;
		this.stats = compilation ? compilation.getStats() : null;
		if(this.stats) {
			this.stats.startTime = this.startTime;
			this.stats.endTime = new Date().getTime();
		}
		if(this.stats) {
			this.compiler.applyPlugins("done", this.stats);
		} else {
			this.compiler.applyPlugins("failed", this.error);
		}
		this.handler(this.error, this.stats);
		if(!this.error) {
			this.watch(compilation.fileDependencies, compilation.contextDependencies, compilation.missingDependencies);
		}
	}

	watch(files, dirs, missing) {
		this.watcher = this.compiler.watchFileSystem.watch(files, dirs, missing, this.startTime, this.watchOptions, (
			err,
			filesModified,
			contextModified,
			missingModified,
			fileTimestamps,
			contextTimestamps
		) => {
			this.watcher = null;
			if(err) {
				return this.handler(err);
			}
			this.compiler.fileTimestamps = fileTimestamps;
			this.compiler.contextTimestamps = contextTimestamps;
			this.invalidate();
		}, (fileName, changeTime) => {
			this.compiler.applyPlugins("invalid", fileName, changeTime);
		});
	}

	invalidate() {
		if(this.watcher) {
			this.watcher.pause();
			this.watcher = null;
		}
		if(this.running) {
			this.invalid = true;
			return false;
		} else {
			this._go();
		}
	}

	close(callback) {
		if(callback === undefined) {
			callback = () => {
			};
		}
		if(this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}
		if(this.running) {
			this.invalid = true;
			this._done = () => {
				callback();
			};
		} else {
			callback();
		}
	}
}
class Compiler extends Tapable {
	constructor() {
		super();
		this.outputPath = "";
		this.outputFileSystem = null;
		this.inputFileSystem = null;
		this.recordsInputPath = null;
		this.recordsOutputPath = null;
		this.records = {};
		this.fileTimestamps = {};
		this.contextTimestamps = {};
		this.resolvers = {
			normal: null,
			loader: null,
			context: null
		};
		let deprecationReported = false;
		this.parser = {
			plugin: (hook, fn) => {
				if(!deprecationReported) {
					console.warn(`webpack: Using compiler.parser is deprecated.\nUse compiler.plugin("compilation", function(compilation, data) {\n  data.normalModuleFactory.plugin("parser", function(parser, options) { parser.plugin(/* ... */); });\n}); instead. It was called ${new Error().stack.split("\n")[2].trim()}.`);
					deprecationReported = true;
				}
				this.plugin("compilation", function(compilation, params) {
					params.normalModuleFactory.plugin("parser", function(parser) {
						parser.plugin(hook, fn);
					});
				});
			},
			apply: () => {
				const args = Array.from(arguments)
				if(!deprecationReported) {
					console.warn(`webpack: Using compiler.parser is deprecated.\nUse compiler.plugin("compilation", function(compilation, data) {\n  data.normalModuleFactory.plugin("parser", function(parser, options) { parser.apply(/* ... */); });\n}); instead. It was called ${new Error().stack.split("\n")[2].trim()}.`);
					deprecationReported = true;
				}
				this.plugin("compilation", function(compilation, params) {
					params.normalModuleFactory.plugin("parser", function(parser) {
						parser.apply(args);
					});
				});
			}
		};
		this.options = {};
	}

	watch(watchOptions, handler) {
		this.fileTimestamps = {};
		this.contextTimestamps = {};
		return new Watching(this, watchOptions, handler);
	}

	run(callback) {
		const self = this;
		const startTime = new Date().getTime();
		self.applyPluginsAsync("before-run", self, (err) => {
			if(err) {
				return callback(err);
			}
			self.applyPluginsAsync("run", self, (err) => {
				if(err) {
					return callback(err);
				}
				self.readRecords(err => {
					if(err) {
						return callback(err);
					}
					self.compile(function onCompiled(err, compilation) {
						if(err) {
							return callback(err);
						}
						if(self.applyPluginsBailResult("should-emit", compilation) === false) {
							const stats = compilation.getStats();
							stats.startTime = startTime;
							stats.endTime = new Date().getTime();
							self.applyPlugins("done", stats);
							return callback(null, stats);
						}
						self.emitAssets(compilation, err => {
							if(err) {
								return callback(err);
							}
							if(compilation.applyPluginsBailResult("need-additional-pass")) {
								compilation.needAdditionalPass = true;
								const stats = compilation.getStats();
								stats.startTime = startTime;
								stats.endTime = new Date().getTime();
								self.applyPlugins("done", stats);
								self.applyPluginsAsync("additional-pass", (err) => {
									if(err) {
										return callback(err);
									}
									self.compile(onCompiled);
								});
								return;
							}
							self.emitRecords(err => {
								if(err) {
									return callback(err);
								}
								const stats = compilation.getStats();
								stats.startTime = startTime;
								stats.endTime = new Date().getTime();
								self.applyPlugins("done", stats);
								return callback(null, stats);
							});
						});
					});
				});
			});
		});
	}

	runAsChild(callback) {
		this.compile((err, compilation) => {
			if(err) {
				return callback(err);
			}
			this.parentCompilation.children.push(compilation);
			Object.keys(compilation.assets).forEach(name => {
				this.parentCompilation.assets[name] = compilation.assets[name];
			});
			const entries = Object.keys(compilation.entrypoints)
				.map(name => compilation.entrypoints[name].chunks)
				.reduce((array, chunks) => array.concat(chunks), []);
			return callback(null, entries, compilation);
		});
	}

	purgeInputFileSystem() {
		if(this.inputFileSystem && this.inputFileSystem.purge) {
			this.inputFileSystem.purge();
		}
	}

	emitAssets(compilation, callback) {
		let outputPath;
		this.applyPluginsAsync("emit", compilation, (err) => {
			if(err) {
				return callback(err);
			}
			outputPath = compilation.getPath(this.outputPath);
			this.outputFileSystem.mkdirp(outputPath, emitFiles.bind(this));
		});
		function emitFiles(err) {
			if(err) {
				return callback(err);
			}
			require("async").forEach(Object.keys(compilation.assets), (file, callback) => {
				let targetFile = file;
				const queryStringIdx = targetFile.indexOf("?");
				if(queryStringIdx >= 0) {
					targetFile = targetFile.substr(0, queryStringIdx);
				}
				if(targetFile.match(/\/|\\/)) {
					const dir = path.dirname(targetFile);
					this.outputFileSystem.mkdirp(this.outputFileSystem.join(outputPath, dir), writeOut.bind(this));
				} else {
					writeOut.call(this);
				}
				function writeOut(err) {
					if(err) {
						return callback(err);
					}
					const targetPath = this.outputFileSystem.join(outputPath, targetFile);
					const source = compilation.assets[file];
					if(source.existsAt === targetPath) {
						source.emitted = false;
						return callback();
					}
					let content = source.source();
					if(!Buffer.isBuffer(content)) {
						content = Buffer.from(content, "utf8");
					}
					source.existsAt = targetPath;
					source.emitted = true;
					this.outputFileSystem.writeFile(targetPath, content, callback);
				}
			}, (err) => {
				if(err) {
					return callback(err);
				}
				afterEmit.call(this);
			});
		}

		function afterEmit() {
			this.applyPluginsAsyncSeries1("after-emit", compilation, (err) => {
				if(err) {
					return callback(err);
				}
				return callback();
			});
		}
	}

	emitRecords(callback) {
		if(!this.recordsOutputPath) {
			return callback();
		}
		const idx1 = this.recordsOutputPath.lastIndexOf("/");
		const idx2 = this.recordsOutputPath.lastIndexOf("\\");
		let recordsOutputPathDirectory = null;
		if(idx1 > idx2) {
			recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1);
		}
		if(idx1 < idx2) {
			recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2);
		}
		if(!recordsOutputPathDirectory) {
			return writeFile.call(this);
		}
		this.outputFileSystem.mkdirp(recordsOutputPathDirectory, (err) => {
			if(err) {
				return callback(err);
			}
			writeFile.call(this);
		});
		function writeFile() {
			this.outputFileSystem.writeFile(this.recordsOutputPath, JSON.stringify(this.records, undefined, 2), callback);
		}
	}

	readRecords(callback) {
		const self = this;
		if(!self.recordsInputPath) {
			self.records = {};
			return callback();
		}
		self.inputFileSystem.stat(self.recordsInputPath, (err) => {
			// It doesn't exist
			// We can ignore self.
			if(err) {
				return callback();
			}
			self.inputFileSystem.readFile(self.recordsInputPath, (err, content) => {
				if(err) {
					return callback(err);
				}
				try {
					// todo: here has hidden to string with 'utf-8'
					self.records = JSON.parse(content);
				} catch(e) {
					e.message = `Cannot parse records: ${e.message}`;
					return callback(e);
				}
				return callback();
			});
		});
	}

	createChildCompiler(compilation, compilerName, outputOptions) {
		const childCompiler = new Compiler();
		for(const pluginName in this._plugins) {
			if([
				"make", "compile", "emit", "after-emit", "invalid", "done", "this-compilation"
			].indexOf(pluginName) < 0) {
				childCompiler._plugins[pluginName] = this._plugins[pluginName].slice();
			}
		}
		childCompiler.name = compilerName;
		childCompiler.outputPath = this.outputPath;
		childCompiler.inputFileSystem = this.inputFileSystem;
		childCompiler.outputFileSystem = null;
		childCompiler.resolvers = this.resolvers;
		childCompiler.fileTimestamps = this.fileTimestamps;
		childCompiler.contextTimestamps = this.contextTimestamps;
		if(!this.records[compilerName]) {
			this.records[compilerName] = [];
		}
		this.records[compilerName].push(childCompiler.records = {});
		childCompiler.options = Object.create(this.options);
		childCompiler.options.output = Object.create(childCompiler.options.output);
		for(const optionName in outputOptions) {
			childCompiler.options.output[optionName] = outputOptions[optionName];
		}
		childCompiler.parentCompilation = compilation;
		return childCompiler;
	}

	isChild() {
		return !!this.parentCompilation;
	}

	createCompilation() {
		return new Compilation(this);
	}

	newCompilation(params) {
		const compilation = this.createCompilation();
		compilation.fileTimestamps = this.fileTimestamps;
		compilation.contextTimestamps = this.contextTimestamps;
		compilation.name = this.name;
		compilation.records = this.records;
		compilation.compilationDependencies = params.compilationDependencies;
		this.applyPlugins("this-compilation", compilation, params);
		this.applyPlugins("compilation", compilation, params);
		return compilation;
	}

	createNormalModuleFactory() {
		const normalModuleFactory = new NormalModuleFactory(this.options.context, this.resolvers, this.options.module || {});
		this.applyPlugins("normal-module-factory", normalModuleFactory);
		return normalModuleFactory;
	}

	createContextModuleFactory() {
		const contextModuleFactory = new ContextModuleFactory(this.resolvers);
		this.applyPlugins("context-module-factory", contextModuleFactory);
		return contextModuleFactory;
	}

	newCompilationParams() {
		return {
			normalModuleFactory: this.createNormalModuleFactory(),
			contextModuleFactory: this.createContextModuleFactory(),
			compilationDependencies: []
		};
	}

	compile(callback) {
		const self = this;
		const params = self.newCompilationParams();
		self.applyPluginsAsync("before-compile", params, (err) => {
			if(err) {
				return callback(err);
			}
			self.applyPlugins("compile", params);
			const compilation = self.newCompilation(params);
			self.applyPluginsParallel("make", compilation, (err) => {
				if(err) {
					return callback(err);
				}
				compilation.finish();
				compilation.seal((err) => {
					if(err) {
						return callback(err);
					}
					self.applyPluginsAsync("after-compile", compilation, (err) => {
						if(err) {
							return callback(err);
						}
						return callback(null, compilation);
					});
				});
			});
		});
	}
}
Compiler.Watching = Watching;
module.exports = Compiler;
