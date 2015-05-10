/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var Tapable = require("tapable");

var Compilation = require("./Compilation");
var Parser = require("./Parser");
var Resolver = require("enhanced-resolve/lib/Resolver");

var NormalModuleFactory = require("./NormalModuleFactory");
var ContextModuleFactory = require("./ContextModuleFactory");

function Watching(compiler, watchOptions, handler) {
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
		this.watchOptions = Object.create(watchOptions);
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
	this.startTime = new Date().getTime();
	this.running = true;
	this.invalid = false;
	this.compiler.applyPluginsAsync("watch-run", this, function(err) {
		if(err) return this._done(err);
		this.compiler.compile(function(err, compilation) {
			if(err) return this._done(err);
			if(this.invalid) return this._done();

			if(this.compiler.applyPluginsBailResult("should-emit", compilation) === false) {
				return this._done(null, compilation);
			}

			this.compiler.emitAssets(compilation, function(err) {
				if(err) return this._done(err);
				if(this.invalid) return this._done();

				this.compiler.emitRecords(function(err) {
					if(err) return this._done(err);

					return this._done(null, compilation);
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}.bind(this));
};

Watching.prototype._done = function(err, compilation) {
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
	if(!this.error)
		this.watch(compilation.fileDependencies, compilation.contextDependencies, compilation.missingDependencies);
};

Watching.prototype.watch = function(files, dirs, missing) {
	this.watcher = this.compiler.watchFileSystem.watch(files, dirs, missing, this.startTime, this.watchOptions, function(err, filesModified, contextModified, missingModified, fileTimestamps, contextTimestamps) {
		this.watcher = null;
		if(err) return this.handler(err);

		this.compiler.fileTimestamps = fileTimestamps;
		this.compiler.contextTimestamps = contextTimestamps;
		this.invalidate();
	}.bind(this), function() {
		this.compiler.applyPlugins("invalid");
	}.bind(this));
};

Watching.prototype.invalidate = function() {
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
};

Watching.prototype.close = function(callback) {
	if(callback === undefined) callback = function(){};

	if(this.watcher) {
		this.watcher.close();
		this.watcher = null;
	}
	if(this.running) {
		this.invalid = true;
		this._done = function() {
			callback();
		};
	} else {
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
		normal: new Resolver(null),
		loader: new Resolver(null),
		context: new Resolver(null)
	};
	this.parser = new Parser();

	this.options = {};
}
module.exports = Compiler;

Compiler.prototype = Object.create(Tapable.prototype);

Compiler.Watching = Watching;
Compiler.prototype.watch = function(watchOptions, handler) {
	this.fileTimestamps = {};
	this.contextTimestamps = {};
	var watching = new Watching(this, watchOptions, handler);
	return watching;
};

Compiler.prototype.run = function(callback) {
	var startTime = new Date().getTime();
	this.applyPluginsAsync("run", this, function(err) {
		if(err) return callback(err);

		this.readRecords(function(err) {
			if(err) return callback(err);

			this.compile(function(err, compilation) {
				if(err) return callback(err);

				if(this.applyPluginsBailResult("should-emit", compilation) === false) {
					var stats = compilation.getStats();
					stats.startTime = startTime;
					stats.endTime = new Date().getTime();
					this.applyPlugins("done", stats);
					return callback(null, stats);
				}

				this.emitAssets(compilation, function(err) {
					if(err) return callback(err);

					this.emitRecords(function(err) {
						if(err) return callback(err);

						var stats = compilation.getStats();
						stats.startTime = startTime;
						stats.endTime = new Date().getTime();
						this.applyPlugins("done", stats);
						return callback(null, stats);
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}.bind(this));
};

Compiler.prototype.runAsChild = function(callback) {
	this.compile(function(err, compilation) {
		if(err) return callback(err);

		this.parentCompilation.children.push(compilation);
		Object.keys(compilation.assets).forEach(function(name) {
			this.parentCompilation.assets[name] = compilation.assets[name];
		}.bind(this));

		var entries = compilation.chunks.filter(function(chunk) {
			return chunk.entry;
		});
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
				if(!Buffer.isBuffer(content))
					content = new Buffer(content, "utf-8");
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
		this.applyPluginsAsync("after-emit", compilation, function(err) {
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
	if(!this.recordsInputPath) {
		this.records = {};
		return callback();
	}
	this.inputFileSystem.stat(this.recordsInputPath, function(err) {
		// It doesn't exist
		// We can ignore this.
		if(err) return callback();

		this.inputFileSystem.readFile(this.recordsInputPath, function(err, content) {
			if(err) return callback(err);

			try {
				this.records = JSON.parse(content);
			} catch(e) {
				e.message = "Cannot parse records: " + e.message;
				return callback(e);
			}

			return callback();
		}.bind(this));
	}.bind(this));
};

Compiler.prototype.createChildCompiler = function(compilation, compilerName, outputOptions) {
	var childCompiler = new Compiler();
	for(var name in this._plugins) {
		if(["make", "compile", "emit", "after-emit", "invalid", "done", "this-compilation"].indexOf(name) < 0)
			childCompiler._plugins[name] = this._plugins[name].slice();
	}
	childCompiler.name = compilerName;
	childCompiler.outputPath = this.outputPath;
	childCompiler.inputFileSystem = this.inputFileSystem;
	childCompiler.outputFileSystem = null;
	childCompiler.resolvers = this.resolvers;
	childCompiler.parser = this.parser;
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
	this.applyPlugins("this-compilation", compilation, params);
	this.applyPlugins("compilation", compilation, params);
	return compilation;
};

Compiler.prototype.createNormalModuleFactory = function() {
	var normalModuleFactory = new NormalModuleFactory(this.options.context, this.resolvers, this.parser, this.options.module || {});
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
		contextModuleFactory: this.createContextModuleFactory()
	};
	return params;
};

Compiler.prototype.compile = function(callback) {
	var params = this.newCompilationParams();
	this.applyPlugins("compile", params);

	var compilation = this.newCompilation(params);

	this.applyPluginsParallel("make", compilation, function(err) {
		if(err) return callback(err);

		compilation.seal(function(err) {
			if(err) return callback(err);

			this.applyPluginsAsync("after-compile", compilation, function(err) {
				if(err) return callback(err);

				return callback(null, compilation);
			});
		}.bind(this));
	}.bind(this));
};
