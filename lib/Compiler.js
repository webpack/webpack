/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const Tapable = require("tapable");

const Compilation = require("./Compilation");

const NormalModuleFactory = require("./NormalModuleFactory");
const ContextModuleFactory = require("./ContextModuleFactory");

class Watching extends Tapable {
	constructor(compiler, watchOptions, handler) {
		super();
		Tapable.call(this);

		this.startTime = null;
		this.invalid = false;
		this.error = null;
		this.stats = null;
		this.handler = handler;
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
		this.startTime = new Date().getTime();
		this.running = true;
		this.invalid = false;
		this.compiler.applyPluginsAsync("watch-run", this, err => {
			if(err) return this._done(err);
			this.compiler.compile(function onCompiled(err, compilation) {
				if(err) return this._done(err);
				if(this.invalid) return this._done();

				if(this.compiler.applyPluginsBailResult("should-emit", compilation) === false) {
					return this._done(null, compilation);
				}

				this.compiler.emitAssets(compilation, err => {
					if(err) return this._done(err);
					if(this.invalid) return this._done();

					this.compiler.emitRecords(err => {
						if(err) return this._done(err);

						if(compilation.applyPluginsBailResult("need-additional-pass")) {
							compilation.needAdditionalPass = true;

							const stats = compilation.getStats();
							stats.startTime = this.startTime;
							stats.endTime = new Date().getTime();
							this.compiler.applyPlugins("done", stats);

							this.compiler.applyPluginsAsync("additional-pass", err => {
								if(err) return this._done(err);
								this.compiler.compile(onCompiled);
							});
							return;
						}
						return this._done(null, compilation);
					});
				});
			});
		});
	}

	_done(err, compilation) {
		this.running = false;
		if(this.invalid) return this._go();
		this.error = err || null;
		this.stats = compilation ? compilation.getStats() : null;
		if(this.stats) {
			this.stats.startTime = this.startTime;
			this.stats.endTime = new Date().getTime();
		}
		if(this.stats)
			this.compiler.applyPlugins("done", this.stats);
		else
      this.compiler.applyPlugins("failed", this.error);
		this.handler(this.error, this.stats);
		if(!this.error && !this.closed)
			this.watch(compilation.fileDependencies, compilation.contextDependencies, compilation.missingDependencies);
	}

	/**
	 * @see Compiler.water
	 * @description watch files in a dir
	 * @param  {Array<string> | any} files files to watch
	 * @param  {Array<string> | any} dirs dirs to watch
	 * @param  {any} missing unknown
	 * @return {void}
	 */
	watch(files, dirs, missing) {
		this.pausedWatcher = null;
		this.watcher = this.compiler.watchFileSystem.watch(files, dirs, missing, this.startTime, this.watchOptions, (
      err,
      filesModified,
      contextModified,
      missingModified,
      fileTimestamps,
      contextTimestamps) => {
			this.pausedWatcher = this.watcher;
			this.watcher = null;
			if(err) return this.handler(err);

			this.compiler.fileTimestamps = fileTimestamps;
			this.compiler.contextTimestamps = contextTimestamps;
			this.invalidate();
		}, (fileName, changeTime) => {
			this.compiler.applyPlugins("invalid", fileName, changeTime);
		});
	}

	invalidate() {
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

	/**
	 * @see Watcher.watcher, Watcher.pausedWatcher
	 * @emits watch-close
	 * @description close watcher
	 * @param  {Function} [callback] optional callback when this_done
	 * @return {void}
	 */
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
				this.compiler.applyPlugins("watch-close");
				callback();
			};
		} else {
			this.compiler.applyPlugins("watch-close");
			callback();
		}
	}
}

class Compiler extends Tapable {
	constructor() {
		super();
		Tapable.call(this);

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

			plugin: function parserPlugin(hook, fn) {
				if(!deprecationReported) {
					console.warn(`webpack: Using compiler.parser is deprecated.\nUse compiler.plugin("compilation", function(compilation, data) {\n  data.normalModuleFactory.plugin("parser", function(parser, options) { parser.plugin(/* ... */); });\n}); instead. It was called ${new Error().stack.split("\n")[2].trim()}.`);
					deprecationReported = true;
				}
				this.plugin("compilation", (compilation, data) => {
					data.normalModuleFactory.plugin("parser", parser => {
						parser.plugin(hook, fn);
					});
				});
			}.bind(this),

			apply: function parserApply() {
				var args = arguments;
				if(!deprecationReported) {
					console.warn("webpack: Using compiler.parser is deprecated.\n" +
						"Use compiler.plugin(\"compilation\", function(compilation, data) {\n  data.normalModuleFactory.plugin(\"parser\", function(parser, options) { parser.apply(/* ... */); });\n}); instead. " +
						"It was called " + new Error().stack.split("\n")[2].trim() + ".");
					deprecationReported = true;
				}
				this.plugin("compilation", function(compilation, data) {
					data.normalModuleFactory.plugin("parser", function(parser) {
						parser.apply.apply(parser, args);
					});
				});
			}.bind(this)
		};

		this.options = {};
	}

	watch(watchOptions, handler) {
		this.fileTimestamps = {};
		this.contextTimestamps = {};
		const watching = new Watching(this, watchOptions, handler);
		return watching;
	}

	run(callback) {
		const startTime = new Date().getTime();

		this.applyPluginsAsync("before-run", this, err => {
			if(err) return callback(err);

			this.applyPluginsAsync("run", this, err => {
				if(err) return callback(err);

				this.readRecords(err => {
					if(err) return callback(err);

					this.compile(function onCompiled(err, compilation) {
						if(err) return callback(err);

						if(this.applyPluginsBailResult("should-emit", compilation) === false) {
							const stats = compilation.getStats();
							stats.startTime = startTime;
							stats.endTime = new Date().getTime();
							this.applyPlugins("done", stats);
							return callback(null, stats);
						}

						this.emitAssets(compilation, err => {
							if(err) return callback(err);

							if(compilation.applyPluginsBailResult("need-additional-pass")) {
								compilation.needAdditionalPass = true;

								const stats = compilation.getStats();
								stats.startTime = startTime;
								stats.endTime = new Date().getTime();
								this.applyPlugins("done", stats);

								this.applyPluginsAsync("additional-pass", err => {
									if(err) return callback(err);
									this.compile(onCompiled);
								});
								return;
							}

							this.emitRecords(err => {
								if(err) return callback(err);

								const stats = compilation.getStats();
								stats.startTime = startTime;
								stats.endTime = new Date().getTime();
								this.applyPlugins("done", stats);
								return callback(null, stats);
							});
						});
					}.bind(this));

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

			const entries = Object.keys(compilation.entrypoints).map(name => compilation.entrypoints[name].chunks).reduce((array, chunks) => array.concat(chunks), []);

			return callback(null, entries, compilation);
		});
	}

	purgeInputFileSystem() {
		if(this.inputFileSystem && this.inputFileSystem.purge)
			this.inputFileSystem.purge();
	}

	emitAssets(compilation, callback) {
		let outputPath;

		this.applyPluginsAsync("emit", compilation, err => {
			if(err) return callback(err);
			outputPath = compilation.getPath(this.outputPath);
			this.outputFileSystem.mkdirp(outputPath, emitFiles.bind(this));
		});

		function emitFiles(err) {
			if(err) return callback(err);

			require("async").forEach(Object.keys(compilation.assets), (file, callback) => {

				let targetFile = file;
				const queryStringIdx = targetFile.indexOf("?");
				if(queryStringIdx >= 0) {
					targetFile = targetFile.substr(0, queryStringIdx);
				}

				if(targetFile.match(/\/|\\/)) {
					const dir = path.dirname(targetFile);
					this.outputFileSystem.mkdirp(this.outputFileSystem.join(outputPath, dir), writeOut.bind(this));
				} else writeOut.call(this);

				function writeOut(err) {
					if(err) return callback(err);
					const targetPath = this.outputFileSystem.join(outputPath, targetFile);
					const source = compilation.assets[file];
					if(source.existsAt === targetPath) {
						source.emitted = false;
						return callback();
					}
					let content = source.source();

					if(!Buffer.isBuffer(content)) {
                        content = new Buffer(content, "utf8"); //eslint-disable-line
					}

					source.existsAt = targetPath;
					source.emitted = true;
					this.outputFileSystem.writeFile(targetPath, content, callback);
				}

			}, err => {
				if(err) return callback(err);

				afterEmit.call(this);
			});
		}

		function afterEmit() {
			this.applyPluginsAsyncSeries1("after-emit", compilation, err => {
				if(err) return callback(err);

				return callback();
			});
		}

	}

	emitRecords(callback) {
		if(!this.recordsOutputPath) return callback();
		const idx1 = this.recordsOutputPath.lastIndexOf("/");
		const idx2 = this.recordsOutputPath.lastIndexOf("\\");
		let recordsOutputPathDirectory = null;
		if(idx1 > idx2) recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1);
		if(idx1 < idx2) recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2);
		if(!recordsOutputPathDirectory) return writeFile.call(this);
		this.outputFileSystem.mkdirp(recordsOutputPathDirectory, err => {
			if(err) return callback(err);
			writeFile.call(this);
		});

		function writeFile() {
			this.outputFileSystem.writeFile(this.recordsOutputPath, JSON.stringify(this.records, undefined, 2), callback);
		}
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
					e.message = `Cannot parse records: ${e.message}`;
					return callback(e);
				}

				return callback();
			});
		});
	}

	createChildCompiler(compilation, compilerName, outputOptions, plugins) {
		const childCompiler = new Compiler();
		if(Array.isArray(plugins)) {
			plugins.forEach(plugin => childCompiler.apply(plugin));
		}
		for(var name in this._plugins) {
			if(!["make", "compile", "emit", "after-emit", "invalid", "done", "this-compilation"].includes(name))
				childCompiler._plugins[name] = this._plugins[name].slice();
		}
		childCompiler.name = compilerName;
		childCompiler.outputPath = this.outputPath;
		childCompiler.inputFileSystem = this.inputFileSystem;
		childCompiler.outputFileSystem = null;
		childCompiler.resolvers = this.resolvers;
		childCompiler.fileTimestamps = this.fileTimestamps;
		childCompiler.contextTimestamps = this.contextTimestamps;
		if(!this.records[compilerName]) this.records[compilerName] = [];
		this.records[compilerName].push(childCompiler.records = {});
		childCompiler.options = Object.create(this.options);
		childCompiler.options.output = Object.create(childCompiler.options.output);
		for(name in outputOptions) {
			childCompiler.options.output[name] = outputOptions[name];
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
		const contextModuleFactory = new ContextModuleFactory(this.resolvers, this.inputFileSystem);
		this.applyPlugins("context-module-factory", contextModuleFactory);
		return contextModuleFactory;
	}

	newCompilationParams() {
		const params = {
			normalModuleFactory: this.createNormalModuleFactory(),
			contextModuleFactory: this.createContextModuleFactory(),
			compilationDependencies: []
		};
		return params;
	}

	compile(callback) {
		const params = this.newCompilationParams();
		this.applyPluginsAsync("before-compile", params, err => {
			if(err) return callback(err);

			this.applyPlugins("compile", params);

			const compilation = this.newCompilation(params);

			this.applyPluginsParallel("make", compilation, err => {
				if(err) return callback(err);

				compilation.finish();

				compilation.seal(err => {
					if(err) return callback(err);

					this.applyPluginsAsync("after-compile", compilation, err => {
						if(err) return callback(err);

						return callback(null, compilation);
					});
				});
			});
		});
	}
}

module.exports = Compiler;

Compiler.Watching = Watching;
