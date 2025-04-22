module.exports = {
	findBundle(i, options) {
		return ["bundle0.js"];
	},
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		scope.window.document.head.appendChild(link);
	}
};
