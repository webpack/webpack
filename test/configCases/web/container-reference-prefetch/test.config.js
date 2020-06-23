module.exports = {
	moduleScope(scope) {
		scope.REMOTE = {
			get(module) {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(() => "remote " + module);
					}, 100);
				});
			}
		};
	}
};
