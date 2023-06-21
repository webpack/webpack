module.exports = {
	moduleScope(scope) {
		const light = scope.window.document.createElement("link");
		light.rel = "stylesheet";
		light.href = "light.css";
		scope.window.document.head.appendChild(light);
		const dark = scope.window.document.createElement("link");
		dark.rel = "stylesheet";
		dark.href = "dark.css";
		scope.window.document.head.appendChild(dark);
	},
	findBundle: function () {
		return ["./runtime.js", "./light.js", "./dark.js"];
	}
};
