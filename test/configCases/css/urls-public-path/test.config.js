module.exports = {
	moduleScope(scope) {
		const link1 = scope.window.document.createElement("link");
		link1.rel = "stylesheet";
		link1.href = "use-style_js.bundle0.css";
		scope.window.document.head.appendChild(link1);
	},
	findBundle: function (i, options) {
		return ["use-style_js.bundle0.js", "bundle0.js"];
	}
};
