module.exports = {
	moduleScope(scope) {
		if (scope.document) {
			const link = scope.document.createElement("link");
			link.rel = "stylesheet";
			link.href = "bundle0.css";
			scope.document.head.appendChild(link);
		}
	}
};
