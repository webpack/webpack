module.exports = {
	moduleScope(scope, options) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "chunk1.css";
		scope.window.document.head.appendChild(link);
	}
};
