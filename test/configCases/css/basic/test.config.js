module.exports = {
	findBundle: function (i, options) {
		return ["style2_css.bundle0.js", "bundle0.js"];
	},
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		scope.window.document.head.appendChild(link);
	}
};
