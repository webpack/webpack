module.exports = function(originalModule) {
	if(!originalModule.webpackPolyfill) {
		var module = Object.create(originalModule);
		// module.parent = undefined by default
		if(!module.children) module.children = [];
		try {
			Object.defineProperty(module, "loaded", {
				enumerable: true,
				get: function() {
					return module.l;
				}
			});
			Object.defineProperty(module, "id", {
				enumerable: true,
				get: function() {
					return module.i;
				}
			});
		} catch(e) {
			// fail silently for IE8, "loaded" and "id" are set in MainTemplate.js if getter is not supported
		}

		Object.defineProperty(module, "exports", {
			enumerable: true,
		});
		module.webpackPolyfill = 1;
	}
	return module;
};
