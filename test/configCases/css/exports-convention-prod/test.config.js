module.exports = {
	moduleScope(scope) {
		if (scope.window) {
			const link = scope.window.document.createElement("link");
			link.rel = "stylesheet";
			link.href = "bundle0.css";
			scope.window.document.head.appendChild(link);
		}
	}
};
