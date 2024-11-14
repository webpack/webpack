module.exports = {
	moduleScope(scope, options) {
		if (options.name.includes("node")) {
			delete scope.Worker;
		}
	},
	findBundle: function (i, options) {
		return ["web-main.mjs"];
	}
};
