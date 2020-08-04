let _URL = require("url").URL;

module.exports = {
	moduleScope(scope) {
		scope.URL = function URL(a, b) {
			return new _URL(a, b);
		};
	}
};
