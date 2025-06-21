module.exports = {
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "https://test.cases/path/bundle.css";
		scope.window.document.head.appendChild(link);
	}
};
