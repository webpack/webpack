/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Stats = require("./Stats");

function MultiStats(stats) {
	this.stats = stats;
	this.hash = stats.map(function(stat) {
		return stat.hash;
	}).join("");
}

MultiStats.prototype.hasErrors = function() {
	return this.stats.map(function(stat) {
		return stat.hasErrors();
	}).reduce(function(a, b) {
		return a || b;
	}, false);
};

MultiStats.prototype.hasWarnings = function() {
	return this.stats.map(function(stat) {
		return stat.hasWarnings();
	}).reduce(function(a, b) {
		return a || b;
	}, false);
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
				return "(" + j.name + ") " + msg;
			}));
		}, []),
		warnings: jsons.reduce(function(arr, j) {
			return arr.concat(j.warnings.map(function(msg) {
				return "(" + j.name + ") " + msg;
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

module.exports = MultiStats;
