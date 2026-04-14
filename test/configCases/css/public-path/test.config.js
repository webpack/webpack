"use strict";

module.exports = {
	moduleScope(scope, options) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = `bundle${options.name}.css`;
		scope.window.document.head.appendChild(link);
	}
};
