const { URL } = require("url");

module.exports = {
	findBundle(i, options) {
		return "./bundle.mjs";
	},
	moduleScope(scope) {
		scope.URL = URL;
	}
};
