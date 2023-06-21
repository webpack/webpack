module.exports = {
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		link.setAttribute("data-webpack", "test:chunk-main");
		scope.window.document.head.appendChild(link);
	}
};
