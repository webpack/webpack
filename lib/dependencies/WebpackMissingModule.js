/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
exports.module = function(request) {
	return "!(function webpackMissingModule() { " +
		exports.moduleCode(request) +
		" }())";
};

exports.promise = function(request) {
	return "Promise.reject(function webpackMissingModule() { " +
		"var e = new Error(" + JSON.stringify("Cannot find module \"" + request + "\"") + "); " +
		"e.code = 'MODULE_NOT_FOUND'; " +
		"return e; " +
		"}())";
};

exports.moduleCode = function(request) {
	return "var e = new Error(" + JSON.stringify("Cannot find module \"" + request + "\"") + "); " +
		"e.code = 'MODULE_NOT_FOUND'; " +
		"throw e;";
};

exports.moduleMetaInfo = function(request) {
	return "!(function webpackMissingModuleMetaInfo() { " +
		"var e = new Error(" + JSON.stringify("Module cannot be imported because no meta info about exports is available \"" + request + "\"") + "); " +
		"e.code = 'MODULE_NOT_FOUND'; " +
		"throw e; " +
		"}())";
};
