/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const toErrorCode = err => `var e = new Error(${JSON.stringify(err)}); e.code = 'MODULE_NOT_FOUND';`;

exports.module = request => `!(function webpackMissingModule() { ${exports.moduleCode(request)} }())`;

exports.promise = function(request) {
	const errorCode = toErrorCode(`Cannot find module "${request}"`);
	return `Promise.reject(function webpackMissingModule() { ${errorCode}; return e; }())`;
};

exports.moduleCode = function(request) {
	const errorCode = toErrorCode(`Cannot find module "${request}"`);
	return `${errorCode}; throw e;`;
};

exports.moduleMetaInfo = function(request) {
	const errorCode = toErrorCode(`Module cannot be imported because no meta info about exports is available "${request}"`);
	return `!(function webpackMissingModuleMetaInfo() { ${errorCode}; throw e; }())`;
};
