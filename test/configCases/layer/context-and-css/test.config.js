module.exports = {
	moduleScope(scope) {
		const light = scope.window.document.createElement("link");
		light.rel = "stylesheet";
		light.href = "light.css";
		scope.window.document.head.appendChild(light);
	},
	findBundle: function () {
		return ["./light.js"];
	}
};
