module.exports = {
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = `bundle${scope.__STATS_I__}.css`;
		scope.window.document.head.appendChild(link);
	}
};
