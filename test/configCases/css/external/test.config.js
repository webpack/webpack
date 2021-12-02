module.exports = {
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "179.bundle0.css";
		scope.window.document.head.appendChild(link);
	}
};
