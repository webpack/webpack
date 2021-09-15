module.exports = {
	moduleScope(scope) {
		scope.ABC = {
			get(module) {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(() => "abc " + module);
					}, 100);
				});
			}
		};
		scope.DEF = {
			get(module) {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(() => ({
							__esModule: true,
							module,
							default: "def"
						}));
					}, 100);
				});
			}
		};
	}
};
