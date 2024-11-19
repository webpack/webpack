const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle: function (i, options) {
		const async1 = findOutputFiles(options, /^async.async_js.+.js/)[0];
		const async2 = findOutputFiles(options, /^async.async_css.+.js/)[0];
		const bundle = findOutputFiles(options, /^bundle.+.js/)[0];
		return [async1, async2, bundle];
	},
	moduleScope(scope, options) {
		const bundle = findOutputFiles(options, /bundle.+.css/)[0];
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = bundle;
		scope.window.document.head.appendChild(link);
	}
};
