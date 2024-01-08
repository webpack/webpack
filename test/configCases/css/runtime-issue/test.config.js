module.exports = {
	moduleScope(scope) {
		const link1 = scope.window.document.createElement("link");
		link1.rel = "stylesheet";
		link1.href = "asyncChunk_js.css";
		scope.window.document.head.appendChild(link1);
		const link2 = scope.window.document.createElement("link");
		link2.rel = "stylesheet";
		link2.href = "asyncChunk2_js.css";
		scope.window.document.head.appendChild(link2);
	},
	findBundle: function (i, options) {
		return [
			"./common-share_js-img_png.js",
			"./asyncChunk_js.js",
			"./main.js",
			"./secondMain.js",
			"./asyncChunk2_js.js"
		];
	}
};
