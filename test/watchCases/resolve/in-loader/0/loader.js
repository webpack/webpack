module.exports = function() {
	const callback = this.async();
	this.resolve(this.context, "./file", (err, file) => {
		if (err) return callback(err);
		this.fs.readFile(file, (err, result) => {
			if (err) return callback(err);
			callback(
				null,
				`export default ${JSON.stringify(result.toString("utf-8").trim())};`
			);
		});
	});
};
