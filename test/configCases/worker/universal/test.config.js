module.exports = {
	moduleScope(scope, options) {
		if (options.name.includes("node")) {
			delete scope.Worker;
		}
	},
	findBundle(i, options) {
		return ["web-main.mjs"];
	}
};
