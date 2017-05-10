/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var Tapable = require("tapable");

var Compilation = require("./Compilation");
var Stats = require("./Stats");
var NormalModuleFactory = require("./NormalModuleFactory");
var ContextModuleFactory = require("./ContextModuleFactory");

var makePathsRelative = require("./util/identifier").makePathsRelative;

function Watching(compiler, watchOptions, handler) {
	this.startTime = null;
	this.invalid = false;
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
	this.compiler.readRecords(function(err) {
		if(err) return this._done(err);

		this._go();
	}.bind(this));
}

Watching.prototype._go = function() {
	var self = this;
	self.startTime = Date.now();
	self.running = true;
	self.invalid = false;
	self.compiler.applyPluginsAsync("watch-run", self, function(err) {
		if(err) return self._done(err);
		self.compiler.compile(function onCompiled(err, compilation) {
			if(err) return self._done(err);
			if(self.invalid) return self._done();

			if(self.compiler.applyPluginsBailResult("should-emit", compilation) === false) {
				return self._done(null, compilation);
			}

			self.compiler.emitAssets(compilation, function(err) {
				if(err) return self._done(err);
				if(self.invalid) return self._done();

				self.compiler.emitRecords(function(err) {
					if(err) return self._done(err);

					if(compilation.applyPluginsBailResult("need-additional-pass")) {
						compilation.needAdditionalPass = true;

						var stats = new Stats(compilation);
						stats.startTime = self.startTime;
						stats.endTime = Date.now();
						self.compiler.applyPlugins("done", stats);

						self.compiler.applyPluginsAsync("additional-pass", function(err) {
							if(err) return self._done(err);
							self.compiler.compile(onCompiled);
						});
						return;
					}
					return self._done(null, compilation);
				});
			});
		});
	});
};

Watching.prototype._getStats = function(compilation) {
	var stats = new Stats(compilation);
	stats.startTime = this.startTime;
	stats.endTime = Date.now();
	return stats;
};

Watching.prototype._done = function(err, compilation) {
	this.running = false;
	if(this.invalid) return this._go();

	var stats = compilation ? this._getStats(compilation) : null;
	if(err) {
		this.compiler.applyPlugins("failed", err);
		this.handler(err, stats);
		return;
	}

	this.compiler.applyPlugins("done", stats);
	this.handler(null, stats);
	if(!this.closed) {
		this.watch(compilation.fileDependencies, compilation.contextDependencies, compilation.missingDependencies);
	}
};

Watching.prototype.watch = function(files, dirs, missing) {
	this.pausedWatcher = null;
	this.watcher = this.compiler.watchFileSystem.watch(files, dirs, missing, this.startTime, this.watchOptions, function(err, filesModified, contextModified, missingModified, fileTimestamps, contextTimestamps) {
		this.pausedWatcher = this.watcher;
		this.watcher = null;
		if(err) return this.handler(err);

		this.compiler.fileTimestamps = fileTimestamps;
		this.compiler.contextTimestamps = contextTimestamps;
		this.invalidate();
	}.bind(this), function(fileName, changeTime) {
		this.compiler.applyPlugins("invalid", fileName, changeTime);
	}.bind(this));
};

Watching.prototype.invalidate = function() {
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
};

Watching.prototype.close = function(callback) {
	if(callback === undefined) callback = function() {};

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
};

function Compiler() {
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
	var deprecationReported = false;
	this.parser = {
		plugin: function(hook, fn) {
			if(!deprecationReported) {
				console.warn("webpack: Using compiler.parser is deprecated.\n" +
					"Use compiler.plugin(\"compilation\", function(compilation, data) {\n  data.normalModuleFactory.plugin(\"parser\", function(parser, options) { parser.plugin(/* ... */); });\n}); instead. " +
					"It was called " + new Error().stack.split("\n")[2].trim() + ".");
				deprecationReported = true;
			}
			this.plugin("compilation", function(compilation, data) {
				data.normalModuleFactory.plugin("parser", function(parser) {
					parser.plugin(hook, fn);
				});
			});
		}.bind(this),
		apply: function() {
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
module.exports = Compiler;

Compiler.prototype = Object.create(Tapable.prototype);
Compiler.prototype.constructor = Compiler;

Compiler.Watching = Watching;
Compiler.prototype.watch = function(watchOptions, handler) {
	this.fileTimestamps = {};
	this.contextTimestamps = {};
	var watching = new Watching(this, watchOptions, handler);
	return watching;
};

Compiler.prototype.run = function(callback) {
	var self = this;
	var startTime = Date.now();

	self.applyPluginsAsync("before-run", self, function(err) {
		if(err) return callback(err);

		self.applyPluginsAsync("run", self, function(err) {
			if(err) return callback(err);

			self.readRecords(function(err) {
				if(err) return callback(err);

				self.compile(function onCompiled(err, compilation) {
					if(err) return callback(err);

					if(self.applyPluginsBailResult("should-emit", compilation) === false) {
						var stats = new Stats(compilation);
						stats.startTime = startTime;
						stats.endTime = Date.now();
						self.applyPlugins("done", stats);
						return callback(null, stats);
					}

					self.emitAssets(compilation, function(err) {
						if(err) return callback(err);

						if(compilation.applyPluginsBailResult("need-additional-pass")) {
							compilation.needAdditionalPass = true;

							var stats = new Stats(compilation);
							stats.startTime = startTime;
							stats.endTime = Date.now();
							self.applyPlugins("done", stats);

							self.applyPluginsAsync("additional-pass", function(err) {
								if(err) return callback(err);
								self.compile(onCompiled);
							});
							return;
						}

						self.emitRecords(function(err) {
							if(err) return callback(err);

							var stats = new Stats(compilation);
							stats.startTime = startTime;
							stats.endTime = Date.now();
							self.applyPlugins("done", stats);
							return callback(null, stats);
						});
					});
				});
			});
		});
	});
};

Compiler.prototype.runAsChild = function(callback) {
	this.compile(function(err, compilation) {
		if(err) return callback(err);

		this.parentCompilation.children.push(compilation);
		Object.keys(compilation.assets).forEach(function(name) {
			this.parentCompilation.assets[name] = compilation.assets[name];
		}.bind(this));

		var entries = Object.keys(compilation.entrypoints).map(function(name) {
			return compilation.entrypoints[name].chunks;
		}).reduce(function(array, chunks) {
			return array.concat(chunks);
		}, []);

		return callback(null, entries, compilation);
	}.bind(this));
};

Compiler.prototype.purgeInputFileSystem = function() {
	if(this.inputFileSystem && this.inputFileSystem.purge)
		this.inputFileSystem.purge();
};

Compiler.prototype.emitAssets = function(compilation, callback) {
	var outputPath;

	this.applyPluginsAsync("emit", compilation, function(err) {
		if(err) return callback(err);
		outputPath = compilation.getPath(this.outputPath);
		this.outputFileSystem.mkdirp(outputPath, emitFiles.bind(this));
	}.bind(this));

	function emitFiles(err) {
		if(err) return callback(err);

		require("async").forEach(Object.keys(compilation.assets), function(file, callback) {

			var targetFile = file;
			var queryStringIdx = targetFile.indexOf("?");
			if(queryStringIdx >= 0) {
				targetFile = targetFile.substr(0, queryStringIdx);
			}

			if(targetFile.match(/\/|\\/)) {
				var dir = path.dirname(targetFile);
				this.outputFileSystem.mkdirp(this.outputFileSystem.join(outputPath, dir), writeOut.bind(this));
			} else writeOut.call(this);

			function writeOut(err) {
				if(err) return callback(err);
				var targetPath = this.outputFileSystem.join(outputPath, targetFile);
				var source = compilation.assets[file];
				if(source.existsAt === targetPath) {
					source.emitted = false;
					return callback();
				}
				var content = source.source();

				if(!Buffer.isBuffer(content)) {
					content = new Buffer(content, "utf8"); //eslint-disable-line
				}

				source.existsAt = targetPath;
				source.emitted = true;
				this.outputFileSystem.writeFile(targetPath, content, callback);
			}

		}.bind(this), function(err) {
			if(err) return callback(err);

			afterEmit.call(this);
		}.bind(this));
	}

	function afterEmit() {
		this.applyPluginsAsyncSeries1("after-emit", compilation, function(err) {
			if(err) return callback(err);

			return callback();
		});
	}

};

Compiler.prototype.emitRecords = function emitRecords(callback) {
	if(!this.recordsOutputPath) return callback();
	var idx1 = this.recordsOutputPath.lastIndexOf("/");
	var idx2 = this.recordsOutputPath.lastIndexOf("\\");
	var recordsOutputPathDirectory = null;
	if(idx1 > idx2) recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1);
	if(idx1 < idx2) recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2);
	if(!recordsOutputPathDirectory) return writeFile.call(this);
	this.outputFileSystem.mkdirp(recordsOutputPathDirectory, function(err) {
		if(err) return callback(err);
		writeFile.call(this);
	}.bind(this));

	function writeFile() {
		this.outputFileSystem.writeFile(this.recordsOutputPath, JSON.stringify(this.records, undefined, 2), callback);
	}
};

Compiler.prototype.readRecords = function readRecords(callback) {
	var self = this;
	if(!self.recordsInputPath) {
		self.records = {};
		return callback();
	}
	self.inputFileSystem.stat(self.recordsInputPath, function(err) {
		// It doesn't exist
		// We can ignore self.
		if(err) return callback();

		self.inputFileSystem.readFile(self.recordsInputPath, function(err, content) {
			if(err) return callback(err);

			try {
				self.records = JSON.parse(content.toString("utf-8"));
			} catch(e) {
				e.message = "Cannot parse records: " + e.message;
				return callback(e);
			}

			return callback();
		});
	});
};

Compiler.prototype.createChildCompiler = function(compilation, compilerName, compilerIndex, outputOptions, plugins) {
	var childCompiler = new Compiler();
	if(Array.isArray(plugins)) {
		plugins.forEach(plugin => childCompiler.apply(plugin));
	}
	for(var name in this._plugins) {
		if(["make", "compile", "emit", "after-emit", "invalid", "done", "this-compilation"].indexOf(name) < 0)
			childCompiler._plugins[name] = this._plugins[name].slice();
	}
	childCompiler.name = compilerName;
	childCompiler.outputPath = this.outputPath;
	childCompiler.inputFileSystem = this.inputFileSystem;
	childCompiler.outputFileSystem = null;
	childCompiler.resolvers = this.resolvers;
	childCompiler.fileTimestamps = this.fileTimestamps;
	childCompiler.contextTimestamps = this.contextTimestamps;

	var relativeCompilerName = makePathsRelative(this.context, compilerName);
	if(!this.records[relativeCompilerName]) this.records[relativeCompilerName] = [];
	if(this.records[relativeCompilerName][compilerIndex])
		childCompiler.records = this.records[relativeCompilerName][compilerIndex];
	else
		this.records[relativeCompilerName].push(childCompiler.records = {});

	if(this.cache) {
		if(!this.cache.children) this.cache.children = {};
		if(!this.cache.children[compilerName]) this.cache.children[compilerName] = [];
		if(this.cache.children[compilerName][compilerIndex])
			childCompiler.cache = this.cache.children[compilerName][compilerIndex];
		else
			this.cache.children[compilerName].push(childCompiler.cache = {});
	}

	childCompiler.options = Object.create(this.options);
	childCompiler.options.output = Object.create(childCompiler.options.output);
	for(name in outputOptions) {
		childCompiler.options.output[name] = outputOptions[name];
	}
	childCompiler.parentCompilation = compilation;
	return childCompiler;
};

Compiler.prototype.isChild = function() {
	return !!this.parentCompilation;
};

Compiler.prototype.createCompilation = function() {
	return new Compilation(this);
};

Compiler.prototype.newCompilation = function(params) {
	var compilation = this.createCompilation();
	compilation.fileTimestamps = this.fileTimestamps;
	compilation.contextTimestamps = this.contextTimestamps;
	compilation.name = this.name;
	compilation.records = this.records;
	compilation.compilationDependencies = params.compilationDependencies;
	this.applyPlugins("this-compilation", compilation, params);
	this.applyPlugins("compilation", compilation, params);
	return compilation;
};

Compiler.prototype.createNormalModuleFactory = function() {
	var normalModuleFactory = new NormalModuleFactory(this.options.context, this.resolvers, this.options.module || {});
	this.applyPlugins("normal-module-factory", normalModuleFactory);
	return normalModuleFactory;
};

Compiler.prototype.createContextModuleFactory = function() {
	var contextModuleFactory = new ContextModuleFactory(this.resolvers, this.inputFileSystem);
	this.applyPlugins("context-module-factory", contextModuleFactory);
	return contextModuleFactory;
};

Compiler.prototype.newCompilationParams = function() {
	var params = {
		normalModuleFactory: this.createNormalModuleFactory(),
		contextModuleFactory: this.createContextModuleFactory(),
		compilationDependencies: []
	};
	return params;
};

Compiler.prototype.compile = function(callback) {
	var self = this;
	var params = self.newCompilationParams();
	self.applyPluginsAsync("before-compile", params, function(err) {
		if(err) return callback(err);

		self.applyPlugins("compile", params);

		var compilation = self.newCompilation(params);

		self.applyPluginsParallel("make", compilation, function(err) {
			if(err) return callback(err);

			compilation.finish();

			compilation.seal(function(err) {
				if(err) return callback(err);

				self.applyPluginsAsync("after-compile", compilation, function(err) {
					if(err) return callback(err);

					return callback(null, compilation);
				});
			});
		});
	});
};
