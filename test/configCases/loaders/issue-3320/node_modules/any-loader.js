var loaderUtils = require('loader-utils');

module.exports = function(source) {
	var loaderContext = this;
	var options = loaderUtils.getOptions(loaderContext);

	return "module.exports=" + JSON.stringify(options.foo);
}
