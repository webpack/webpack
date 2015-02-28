/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Tapable = require("tapable");
var async = require("async");
var Stats = require("./Stats");

function MultiWatching(watchings) {
	this.watchings = watchings;
}

MultiWatching.prototype.invalidate = function() {
	this.watchings.forEach(function(watching) {
		watching.invalidate();
	});
};

MultiWatching.prototype.close = function(callback) {
	async.forEach(this.watchings, function(watching, callback) {
		watching.close(callback);
	}, callback);
};

function MultiCompiler(compilers) {
	Tapable.call(this);
	if(!Array.isArray(compilers)) {
		compilers = Object.keys(compilers).map(function(name) {
			compilers[name].name = name;
			return compilers[name];
		});
	}
	this.compilers = compilers;

	function delegateProperty(name) {
		Object.defineProperty(this, name, {
			configurable: false,
			get: function() {
				throw new Error("Cannot read " + name + " of a MultiCompiler");
			},
			set: function(value) {
				this.compilers.forEach(function(compiler) {
					compiler[name] = value;
				});
			}.bind(this)
		});
	}
	delegateProperty.call(this, "outputFileSystem");
	delegateProperty.call(this, "inputFileSystem");
	
	Object.defineProperty(this, "outputPath", {
		configurable: false,
		get: function() {
			var commonPath = compilers[0].outputPath;
			for(var i = 1; i < compilers.length; i++) {
				while(compilers[i].outputPath.indexOf(commonPath) !== 0 && /[\/\\]/.test(commonPath)) {
					commonPath = commonPath.replace(/[\/\\][^\/\\]*$/, "");
				}
			}
			if(!commonPath && compilers[0].outputPath[0] === "/") return "/";
			return commonPath;
		}
	});

	var doneCompilers = 0;
	var compilerStats = [];
	this.compilers.forEach(function(compiler, idx) {
		var compilerDone = false;
		compiler.plugin("done", function(stats) {
			if(!compilerDone) {
				compilerDone = true;
				doneCompilers++;
			}
			compilerStats[idx] = stats;
			if(doneCompilers === this.compilers.length) {
				this.applyPlugins("done", new MultiStats(compilerStats));
			}
		}.bind(this));
		compiler.plugin("invalid", function() {
			if(compilerDone) {
				compilerDone = false;
				doneCompilers--;
			}
			this.applyPlugins("invalid");
		}.bind(this));
	}, this);
}
module.exports = MultiCompiler;

MultiCompiler.prototype = Object.create(Tapable.prototype);

MultiCompiler.prototype.watch = function(watchDelay, handler) {
	var watchings = this.compilers.map(function(compiler) {
		return compiler.watch(watchDelay, handler);
	});
	return new MultiWatching(watchings);
};

MultiCompiler.prototype.run = function(callback) {
	async.map(this.compilers, function(compiler, callback) {
		compiler.run(callback);
	}, function(err, stats) {
		if(err) return callback(err);
		callback(null, new MultiStats(stats));
	});
};

MultiCompiler.prototype.purgeInputFileSystem = function() {
	this.compilers.forEach(function(compiler) {
		if(compiler.inputFileSystem && compiler.inputFileSystem.purge)
			compiler.inputFileSystem.purge();
	});
};

function MultiStats(stats) {
	this.stats = stats;
	this.hash = stats.map(function(stat) {
		return stat.hash;
	}).join("");
}

MultiStats.prototype.hasErrors = function() {
	return this.stats.map(function(stat) {
		return stat.hasErrors();
	}).reduce(function(a, b) { return a || b; }, false);
};

MultiStats.prototype.hasWarnings = function() {
	return this.stats.map(function(stat) {
		return stat.hasWarnings();
	}).reduce(function(a, b) { return a || b; }, false);
};

MultiStats.prototype.toJson = function(options, forToString) {
	var jsons = this.stats.map(function(stat) {
		var obj = stat.toJson(options, forToString);
		obj.name = stat.compilation && stat.compilation.name;
		return obj;
	});
	var obj = {
		errors: jsons.reduce(function(arr, j) {
			return arr.concat(j.errors.map(function(msg) {
				return "(" + j.name + ") " + msg
			}));
		}, []),
		warnings: jsons.reduce(function(arr, j) {
			return arr.concat(j.warnings.map(function(msg) {
				return "(" + j.name + ") " + msg
			}));
		}, [])
	};
	if(!options || options.version !== false)
		obj.version = require("../package.json").version;
	if(!options || options.hash !== false)
		obj.hash = this.hash;
	if(!options || options.children !== false)
		obj.children = jsons;
	return obj;
};

MultiStats.prototype.toString = Stats.prototype.toString;