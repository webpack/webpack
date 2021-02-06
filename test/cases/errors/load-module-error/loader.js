exports.default = function(source) {
	const callback = this.async();
	const ref = JSON.parse(source);
	this.loadModule("./error-loader!" + ref, (err, source, sourceMap, module) => {
		if (err) {
			callback(err);
		} else {
			callback(null, JSON.stringify(`source: ${JSON.parse(source)}`));
		}
	});
};
