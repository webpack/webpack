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
	if(typeof options === "boolean" || typeof options === "string") {
		options = Stats.presetToOptions(options);
	} else if(!options) {
		options = {};
	}
	var jsons = this.stats.map((stat, idx) => {
		var childOptions = Stats.getChildOptions(options, idx);
		var obj = stat.toJson(childOptions, forToString);
		obj.name = stat.compilation && stat.compilation.name;
		return obj;
	});
	var showVersion = typeof options.version === "undefined" ? jsons.every(j => j.version) : options.version !== false;
	var showHash = typeof options.hash === "undefined" ? jsons.every(j => j.hash) : options.hash !== false;
	jsons.forEach(j => {
		if(showVersion)
			delete j.version;
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
	if(showVersion)
		obj.version = require("../package.json").version;
	if(showHash)
		obj.hash = this.hash;
	if(options.children !== false)
		obj.children = jsons;
	return obj;
};

MultiStats.prototype.toString = Stats.prototype.toString;

module.exports = MultiStats;
