var testPlugin = function() {
	this.hooks.compilation.tap("TestPlugin", compilation => {
		compilation.hooks.finishModules.tapAsync("TestPlugin", function(
			_modules,
			callback
		) {
			callback();
		});
	});
};

module.exports = {
	plugins: [testPlugin]
};
