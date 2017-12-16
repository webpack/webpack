/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const util = require("util");
const Tapable = require("tapable").Tapable;
const SyncHook = require("tapable").SyncHook;
const SyncBailHook = require("tapable").SyncBailHook;
const AsyncParallelHook = require("tapable").AsyncParallelHook;
const AsyncSeriesHook = require("tapable").AsyncSeriesHook;

const Compilation = require("./Compilation");
const Stats = require("./Stats");
const NormalModuleFactory = require("./NormalModuleFactory");
const ContextModuleFactory = require("./ContextModuleFactory");
const ResolverFactory = require("./ResolverFactory");

const RequestShortener = require("./RequestShortener");
const makePathsRelative = require("./util/identifier").makePathsRelative;

class Watching {
	constructor(compiler, watchOptions, handler) {
		this.startTime = null;
		this.invalid = false;
		this.handler = handler;
		this.callbacks = [];
		this.closed = false;
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
		this.compiler = compiler;
		this.running = true;
		this.compiler.readRecords(err => {
			if(err) return this._done(err);

			this._go();
		});
	}

	_go() {
		this.startTime = Date.now();
		this.running = true;
		this.invalid = false;
		this.compiler.hooks.watchRun.callAsync(this.compiler, err => {
			if(err) return this._done(err);
			const onCompiled = (err, compilation) => {
				if(err) return this._done(err);
				if(this.invalid) return this._done();

				if(this.compiler.hooks.shouldEmit.call(compilation) === false) {
					return this._done(null, compilation);
				}

				this.compiler.emitAssets(compilation, err => {
					if(err) return this._done(err);
					if(this.invalid) return this._done();

					this.compiler.emitRecords(err => {
						if(err) return this._done(err);

						if(compilation.hooks.needAdditionalPass.call()) {
							compilation.needAdditionalPass = true;

							const stats = new Stats(compilation);
							stats.startTime = this.startTime;
							stats.endTime = Date.now();
							this.compiler.hooks.done.call(stats);

							this.compiler.hooks.additionalPass.callAsync(err => {
								if(err) return this._done(err);
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

	_getStats(compilation) {
		const stats = new Stats(compilation);
		stats.startTime = this.startTime;
		stats.endTime = Date.now();
		return stats;
	}

	_done(err, compilation) {
		this.running = false;
		if(this.invalid) return this._go();

		const stats = compilation ? this._getStats(compilation) : null;
		if(err) {
			this.compiler.hooks.failed.call(err);
			this.handler(err, stats);
			return;
		}

		this.compiler.hooks.done.call(stats);
		this.handler(null, stats);
		if(!this.closed) {
			this.watch(Array.from(compilation.fileDependencies), Array.from(compilation.contextDependencies), Array.from(compilation.missingDependencies));
		}
		this.callbacks.forEach(cb => cb());
		this.callbacks.length = 0;
	}

	watch(files, dirs, missing) {
		this.pausedWatcher = null;
		this.watcher = this.compiler.watchFileSystem.watch(files, dirs, missing, this.startTime, this.watchOptions, (err, filesModified, contextModified, missingModified, fileTimestamps, contextTimestamps) => {
			this.pausedWatcher = this.watcher;
			this.watcher = null;
			if(err) return this.handler(err);

			this.compiler.fileTimestamps = fileTimestamps;
			this.compiler.contextTimestamps = contextTimestamps;
			this.invalidate();
		}, (fileName, changeTime) => {
			this.compiler.hooks.invalid.call(fileName, changeTime);
		});
	}

	invalidate(callback) {
		if(callback) {
			this.callbacks.push(callback);
		}
		if(this.watcher) {
			this.pausedWatcher = this.watcher;
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
		if(callback === undefined) callback = () => {};

		this.closed = true;
		if(this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}
		if(this.pausedWatcher) {
			this.pausedWatcher.close();
			this.pausedWatcher = null;
		}
		if(this.running) {
			this.invalid = true;
			this._done = () => {
				this.compiler.hooks.watchClose.call();
				callback();
			};
		} else {
			this.compiler.hooks.watchClose.call();
			callback();
		}
	}
}

class Compiler extends Tapable {
	constructor(context) {
		super();
		this.hooks = {
			shouldEmit: new SyncBailHook(["compilation"]),
			done: new SyncHook(["stats"]),
			additionalPass: new AsyncSeriesHook([]),
			beforeRun: new AsyncSeriesHook(["compilation"]),
			run: new AsyncSeriesHook(["compilation"]),
			emit: new AsyncSeriesHook(["compilation"]),
			afterEmit: new AsyncSeriesHook(["compilation"]),
			thisCompilation: new SyncHook(["compilation", "params"]),
			compilation: new SyncHook(["compilation", "params"]),
			normalModuleFactory: new SyncHook(["normalModuleFactory"]),
			contextModuleFactory: new SyncHook(["contextModulefactory"]),
			beforeCompile: new AsyncSeriesHook(["params"]),
			compile: new SyncHook(["params"]),
			make: new AsyncParallelHook(["compilation"]),
			afterCompile: new AsyncSeriesHook(["compilation"]),
			watchRun: new AsyncSeriesHook(["compiler"]),
			failed: new SyncHook(["error"]),
			invalid: new SyncHook(["filename", "changeTime"]),
			watchClose: new SyncHook([]),

			// TODO the following hooks are weirdly located here
			// TODO move them for webpack 5
			environment: new SyncHook([]),
			afterEnvironment: new SyncHook([]),
			afterPlugins: new SyncHook(["compiler"]),
			afterResolvers: new SyncHook(["compiler"]),
			entryOption: new SyncBailHook(["context", "entry"]),
		};
		this._pluginCompat.tap("Compiler", options => {
			switch(options.name) {
				case "additional-pass":
				case "before-run":
				case "run":
				case "emit":
				case "after-emit":
				case "before-compile":
				case "make":
				case "after-compile":
				case "watch-run":
					options.async = true;
					break;
			}
		});

		this.outputPath = "";
		this.outputFileSystem = null;
		this.inputFileSystem = null;

		this.recordsInputPath = null;
		this.recordsOutputPath = null;
		this.records = {};

		this.fileTimestamps = {};
		this.contextTimestamps = {};

		this.resolverFactory = new ResolverFactory();
		this.resolvers = {
			normal: {
				plugins: util.deprecate(
					(hook, fn) => {
						this.resolverFactory.plugin("resolver normal", resolver => {
							resolver.plugin(hook, fn);
						});
					},
					"webpack: Using compiler.resolvers.normal is deprecated.\n" +
					"Use compiler.resolverFactory.plugin(\"resolver normal\", resolver => {\n  resolver.plugin(/* ... */);\n}); instead."
				),
				apply: util.deprecate(
					(...args) => {
						this.resolverFactory.plugin("resolver normal", resolver => {
							resolver.apply(...args);
						});
					},
					"webpack: Using compiler.resolvers.normal is deprecated.\n" +
					"Use compiler.resolverFactory.plugin(\"resolver normal\", resolver => {\n  resolver.apply(/* ... */);\n}); instead."
				)
			},
			loader: {
				plugins: util.deprecate(
					(hook, fn) => {
						this.resolverFactory.plugin("resolver loader", resolver => {
							resolver.plugin(hook, fn);
						});
					},
					"webpack: Using compiler.resolvers.loader is deprecated.\n" +
					"Use compiler.resolverFactory.plugin(\"resolver loader\", resolver => {\n  resolver.plugin(/* ... */);\n}); instead."
				),
				apply: util.deprecate(
					(...args) => {
						this.resolverFactory.plugin("resolver loader", resolver => {
							resolver.apply(...args);
						});
					},
					"webpack: Using compiler.resolvers.loader is deprecated.\n" +
					"Use compiler.resolverFactory.plugin(\"resolver loader\", resolver => {\n  resolver.apply(/* ... */);\n}); instead."
				)
			},
			context: {
				plugins: util.deprecate(
					(hook, fn) => {
						this.resolverFactory.plugin("resolver context", resolver => {
							resolver.plugin(hook, fn);
						});
					},
					"webpack: Using compiler.resolvers.context is deprecated.\n" +
					"Use compiler.resolverFactory.plugin(\"resolver context\", resolver => {\n  resolver.plugin(/* ... */);\n}); instead."
				),
				apply: util.deprecate(
					(...args) => {
						this.resolverFactory.plugin("resolver context", resolver => {
							resolver.apply(...args);
						});
					},
					"webpack: Using compiler.resolvers.context is deprecated.\n" +
					"Use compiler.resolverFactory.plugin(\"resolver context\", resolver => {\n  resolver.apply(/* ... */);\n}); instead."
				)
			}
		};
		this.parser = {
			plugin: util.deprecate(
				(hook, fn) => {
					this.plugin("compilation", (compilation, data) => {
						data.normalModuleFactory.plugin("parser", parser => {
							parser.plugin(hook, fn);
						});
					});
				},
				"webpack: Using compiler.parser is deprecated.\n" +
				"Use compiler.plugin(\"compilation\", function(compilation, data) {\n  data.normalModuleFactory.plugin(\"parser\", function(parser, options) { parser.plugin(/* ... */); });\n}); instead. "
			),
			apply: util.deprecate(
				(...args) => {
					this.plugin("compilation", (compilation, data) => {
						data.normalModuleFactory.plugin("parser", parser => {
							parser.apply(...args);
						});
					});
				},
				"webpack: Using compiler.parser is deprecated.\n" +
				"Use compiler.plugin(\"compilation\", function(compilation, data) {\n  data.normalModuleFactory.plugin(\"parser\", function(parser, options) { parser.apply(/* ... */); });\n}); instead. "
			)
		};

		this.options = {};

		this.context = context;

		this.requestShortener = new RequestShortener(context);
	}

	watch(watchOptions, handler) {
		this.fileTimestamps = {};
		this.contextTimestamps = {};
		const watching = new Watching(this, watchOptions, handler);
		return watching;
	}

	run(callback) {
		const startTime = Date.now();

		const onCompiled = (err, compilation) => {
			if(err) return callback(err);

			if(this.hooks.shouldEmit.call(compilation) === false) {
				const stats = new Stats(compilation);
				stats.startTime = startTime;
				stats.endTime = Date.now();
				this.hooks.done.call(stats);
				return callback(null, stats);
			}

			this.emitAssets(compilation, err => {
				if(err) return callback(err);

				if(compilation.hooks.needAdditionalPass.call()) {
					compilation.needAdditionalPass = true;

					const stats = new Stats(compilation);
					stats.startTime = startTime;
					stats.endTime = Date.now();
					this.hooks.done.call(stats);

					this.hooks.additionalPass.callAsync(err => {
						if(err) return callback(err);
						this.compile(onCompiled);
					});
					return;
				}

				this.emitRecords(err => {
					if(err) return callback(err);

					const stats = new Stats(compilation);
					stats.startTime = startTime;
					stats.endTime = Date.now();
					this.hooks.done.call(stats);
					return callback(null, stats);
				});
			});
		};

		this.hooks.beforeRun.callAsync(this, err => {
			if(err) return callback(err);

			this.hooks.run.callAsync(this, err => {
				if(err) return callback(err);

				this.readRecords(err => {
					if(err) return callback(err);

					this.compile(onCompiled);
				});
			});
		});
	}

	runAsChild(callback) {
		this.compile((err, compilation) => {
			if(err) return callback(err);

			this.parentCompilation.children.push(compilation);
			Object.keys(compilation.assets).forEach(name => {
				this.parentCompilation.assets[name] = compilation.assets[name];
			});

			const entries = Object.keys(compilation.entrypoints).map(name => {
				return compilation.entrypoints[name].chunks;
			}).reduce((array, chunks) => {
				return array.concat(chunks);
			}, []);

			return callback(null, entries, compilation);
		});
	}

	purgeInputFileSystem() {
		if(this.inputFileSystem && this.inputFileSystem.purge)
			this.inputFileSystem.purge();
	}

	emitAssets(compilation, callback) {
		let outputPath;

		const emitFiles = (err) => {
			if(err) return callback(err);

			require("async").forEach(Object.keys(compilation.assets), (file, callback) => {

				let targetFile = file;
				const queryStringIdx = targetFile.indexOf("?");
				if(queryStringIdx >= 0) {
					targetFile = targetFile.substr(0, queryStringIdx);
				}

				const writeOut = (err) => {
					if(err) return callback(err);
					const targetPath = this.outputFileSystem.join(outputPath, targetFile);
					const source = compilation.assets[file];
					if(source.existsAt === targetPath) {
						source.emitted = false;
						return callback();
					}
					let content = source.source();

					if(!Buffer.isBuffer(content)) {
						content = new Buffer(content, "utf8"); // eslint-disable-line
					}

					source.existsAt = targetPath;
					source.emitted = true;
					this.outputFileSystem.writeFile(targetPath, content, callback);
				};

				if(targetFile.match(/\/|\\/)) {
					const dir = path.dirname(targetFile);
					this.outputFileSystem.mkdirp(this.outputFileSystem.join(outputPath, dir), writeOut);
				} else writeOut();

			}, err => {
				if(err) return callback(err);

				this.hooks.afterEmit.callAsync(compilation, err => {
					if(err) return callback(err);

					return callback();
				});
			});
		};

		this.hooks.emit.callAsync(compilation, err => {
			if(err) return callback(err);
			outputPath = compilation.getPath(this.outputPath);
			this.outputFileSystem.mkdirp(outputPath, emitFiles);
		});
	}

	emitRecords(callback) {
		if(!this.recordsOutputPath) return callback();
		const idx1 = this.recordsOutputPath.lastIndexOf("/");
		const idx2 = this.recordsOutputPath.lastIndexOf("\\");
		let recordsOutputPathDirectory = null;
		if(idx1 > idx2) recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1);
		if(idx1 < idx2) recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2);

		const writeFile = () => {
			this.outputFileSystem.writeFile(this.recordsOutputPath, JSON.stringify(this.records, undefined, 2), callback);
		};

		if(!recordsOutputPathDirectory)
			return writeFile();
		this.outputFileSystem.mkdirp(recordsOutputPathDirectory, err => {
			if(err) return callback(err);
			writeFile();
		});
	}

	readRecords(callback) {
		if(!this.recordsInputPath) {
			this.records = {};
			return callback();
		}
		this.inputFileSystem.stat(this.recordsInputPath, err => {
			// It doesn't exist
			// We can ignore this.
			if(err) return callback();

			this.inputFileSystem.readFile(this.recordsInputPath, (err, content) => {
				if(err) return callback(err);

				try {
					this.records = JSON.parse(content.toString("utf-8"));
				} catch(e) {
					e.message = "Cannot parse records: " + e.message;
					return callback(e);
				}

				return callback();
			});
		});
	}

	createChildCompiler(compilation, compilerName, compilerIndex, outputOptions, plugins) {
		const childCompiler = new Compiler(this.context);
		if(Array.isArray(plugins)) {
			plugins.forEach(plugin => childCompiler.apply(plugin));
		}
		for(const name in this.hooks) {
			if(["make", "compile", "emit", "afterEmit", "invalid", "done", "thisCompilation"].indexOf(name) < 0) {
				if(childCompiler.hooks[name])
					childCompiler.hooks[name].taps = this.hooks[name].taps.slice();
			}
		}
		childCompiler.name = compilerName;
		childCompiler.outputPath = this.outputPath;
		childCompiler.inputFileSystem = this.inputFileSystem;
		childCompiler.outputFileSystem = null;
		childCompiler.resolverFactory = this.resolverFactory;
		childCompiler.fileTimestamps = this.fileTimestamps;
		childCompiler.contextTimestamps = this.contextTimestamps;

		const relativeCompilerName = makePathsRelative(this.context, compilerName);
		if(!this.records[relativeCompilerName]) this.records[relativeCompilerName] = [];
		if(this.records[relativeCompilerName][compilerIndex])
			childCompiler.records = this.records[relativeCompilerName][compilerIndex];
		else
			this.records[relativeCompilerName].push(childCompiler.records = {});

		childCompiler.options = Object.create(this.options);
		childCompiler.options.output = Object.create(childCompiler.options.output);
		for(const name in outputOptions) {
			childCompiler.options.output[name] = outputOptions[name];
		}
		childCompiler.parentCompilation = compilation;

		compilation.hooks.childCompiler.call(childCompiler, compilerName, compilerIndex);

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
		this.hooks.thisCompilation.call(compilation, params);
		this.hooks.compilation.call(compilation, params);
		return compilation;
	}

	createNormalModuleFactory() {
		const normalModuleFactory = new NormalModuleFactory(this.options.context, this.resolverFactory, this.options.module || {});
		this.hooks.normalModuleFactory.call(normalModuleFactory);
		return normalModuleFactory;
	}

	createContextModuleFactory() {
		const contextModuleFactory = new ContextModuleFactory(this.resolverFactory, this.inputFileSystem);
		this.hooks.contextModuleFactory.call(contextModuleFactory);
		return contextModuleFactory;
	}

	newCompilationParams() {
		const params = {
			normalModuleFactory: this.createNormalModuleFactory(),
			contextModuleFactory: this.createContextModuleFactory(),
			compilationDependencies: new Set()
		};
		return params;
	}

	compile(callback) {
		const params = this.newCompilationParams();
		this.hooks.beforeCompile.callAsync(params, err => {
			if(err) return callback(err);

			this.hooks.compile.call(params);

			const compilation = this.newCompilation(params);

			this.hooks.make.callAsync(compilation, err => {
				if(err) return callback(err);

				compilation.finish();

				compilation.seal(err => {
					if(err) return callback(err);

					this.hooks.afterCompile.callAsync(compilation, err => {
						if(err) return callback(err);

						return callback(null, compilation);
					});
				});
			});
		});
	}
}

Compiler.Watching = Watching;
module.exports = Compiler;
