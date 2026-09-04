module.exports = function(content) {
	var cb = this.async();
	var json = JSON.parse(content);
	var imports = json.imports;
	var results = [];
	var self = this;
	var next = function(index) {
		if (index === imports.length) {
			cb(
				null,
				"module.exports = " +
					JSON.stringify(
						results.reduce(function(prev, result) {
							return { ...prev, ...result };
						}, json)
					)
			);
			return;
		}
		self.loadModule(imports[index], function(err, source, map, module) {
			if (err) {
				return cb(err);
			}
			results.push(JSON.parse(source));
			next(index + 1);
		});
	};
	next(0);
};
