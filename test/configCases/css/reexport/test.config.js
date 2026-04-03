"use strict";

module.exports = {
	moduleScope(scope, options) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = options.output.filename.replace("js", "css");
		scope.window.document.head.appendChild(link);
	}
};
