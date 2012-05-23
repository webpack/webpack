module.exports = function(module) {
	if(!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.id = "webpack";
		module.webpackPolyfill = 1;
	}
	return module;
}
