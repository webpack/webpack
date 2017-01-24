/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Tapable = require("tapable");
var async = require("async");
var MultiWatching = require("./MultiWatching");
var MultiStats = require("./MultiStats");

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
MultiCompiler.prototype.constructor = MultiCompiler;

function runWithDependencies(compilers, fn, callback) {
	var fulfilledNames = {};
	var remainingCompilers = compilers;

	function isDependencyFulfilled(d) {
		return fulfilledNames[d];
	}

	function getReadyCompilers() {
		var readyCompilers = [];
		var list = remainingCompilers;
		remainingCompilers = [];
		for(var i = 0; i < list.length; i++) {
			var c = list[i];
			var ready = !c.dependencies || c.dependencies.every(isDependencyFulfilled);
			if(ready)
				readyCompilers.push(c);
			else
				remainingCompilers.push(c);
		}
		return readyCompilers;
	}

	function runCompilers(callback) {
		if(remainingCompilers.length === 0) return callback();
		async.map(getReadyCompilers(), function(compiler, callback) {
			fn(compiler, function(err) {
				if(err) return callback(err);
				fulfilledNames[compiler.name] = true;
				runCompilers(callback);
			});
		}, callback);
	}
	runCompilers(callback);
}

MultiCompiler.prototype.watch = function(watchOptions, handler) {
	var watchings = [];
	var allStats = this.compilers.map(function() {
		return null;
	});
	var compilerStatus = this.compilers.map(function() {
		return false;
	});

	runWithDependencies(this.compilers, function(compiler, callback) {
		var compilerIdx = this.compilers.indexOf(compiler);
		var firstRun = true;
		var watching = compiler.watch(watchOptions, function(err, stats) {
			if(err)
				handler(err);
			if(stats) {
				allStats[compilerIdx] = stats;
				compilerStatus[compilerIdx] = "new";
				if(compilerStatus.every(Boolean)) {
					var freshStats = allStats.filter(function(s, idx) {
						return compilerStatus[idx] === "new";
					});
					compilerStatus.fill(true);
					var multiStats = new MultiStats(freshStats);
					handler(null, multiStats);
				}
			}
			if(firstRun && !err) {
				firstRun = false;
				callback();
			}
		});
		watchings.push(watching);
	}.bind(this), function() {
		// ignore
	});

	return new MultiWatching(watchings);
};

MultiCompiler.prototype.run = function(callback) {
	var allStats = this.compilers.map(function() {
		return null;
	});

	runWithDependencies(this.compilers, function(compiler, callback) {
		var compilerIdx = this.compilers.indexOf(compiler);
		compiler.run(function(err, stats) {
			if(err) return callback(err);
			allStats[compilerIdx] = stats;
			callback();
		});
	}.bind(this), function(err) {
		if(err) return callback(err);
		callback(null, new MultiStats(allStats));
	});
};

MultiCompiler.prototype.purgeInputFileSystem = function() {
	this.compilers.forEach(function(compiler) {
		if(compiler.inputFileSystem && compiler.inputFileSystem.purge)
			compiler.inputFileSystem.purge();
	});
};
