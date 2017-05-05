/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const Tapable = require("tapable");
const asyncLib = require("async");
const MultiWatching = require("./MultiWatching");
const MultiStats = require("./MultiStats");

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
			let commonPath = compilers[0].outputPath;
			for(let i = 1; i < compilers.length; i++) {
				while(compilers[i].outputPath.indexOf(commonPath) !== 0 && /[\/\\]/.test(commonPath)) {
					commonPath = commonPath.replace(/[\/\\][^\/\\]*$/, "");
				}
			}
			if(!commonPath && compilers[0].outputPath[0] === "/") return "/";
			return commonPath;
		}
	});

	let doneCompilers = 0;
	let compilerStats = [];
	this.compilers.forEach(function(compiler, idx) {
		let compilerDone = false;
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
	let fulfilledNames = {};
	let remainingCompilers = compilers;

	function isDependencyFulfilled(d) {
		return fulfilledNames[d];
	}

	function getReadyCompilers() {
		let readyCompilers = [];
		let list = remainingCompilers;
		remainingCompilers = [];
		for(let i = 0; i < list.length; i++) {
			let c = list[i];
			let ready = !c.dependencies || c.dependencies.every(isDependencyFulfilled);
			if(ready)
				readyCompilers.push(c);
			else
				remainingCompilers.push(c);
		}
		return readyCompilers;
	}

	function runCompilers(callback) {
		if(remainingCompilers.length === 0) return callback();
		asyncLib.map(getReadyCompilers(), function(compiler, callback) {
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
	let watchings = [];
	let allStats = this.compilers.map(function() {
		return null;
	});
	let compilerStatus = this.compilers.map(function() {
		return false;
	});
	runWithDependencies(this.compilers, function(compiler, callback) {
		let compilerIdx = this.compilers.indexOf(compiler);
		let firstRun = true;
		let watching = compiler.watch(Array.isArray(watchOptions) ? watchOptions[compilerIdx] : watchOptions, function(err, stats) {
			if(err)
				handler(err);
			if(stats) {
				allStats[compilerIdx] = stats;
				compilerStatus[compilerIdx] = "new";
				if(compilerStatus.every(Boolean)) {
					let freshStats = allStats.filter(function(s, idx) {
						return compilerStatus[idx] === "new";
					});
					compilerStatus.fill(true);
					let multiStats = new MultiStats(freshStats);
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

	return new MultiWatching(watchings, this);
};

MultiCompiler.prototype.run = function(callback) {
	let allStats = this.compilers.map(function() {
		return null;
	});

	runWithDependencies(this.compilers, function(compiler, callback) {
		let compilerIdx = this.compilers.indexOf(compiler);
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
