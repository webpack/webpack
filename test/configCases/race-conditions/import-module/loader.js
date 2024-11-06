/** @type {import("../../../../").LoaderDefinition} */
module.exports.pitch = function (request) {
	const callback = this.async();
	let finished = false;

	this.importModule(
		`${this.resourcePath}.webpack[javascript/auto]!=!!!${request}`,
		{},
		(err, result) => {
			if (err) return callback(err);
			if (finished) return;
			finished = true;
			callback(null, `module.exports = ${JSON.stringify(result)};`);
		}
	);
	setTimeout(() => {
		if (finished) return;
		finished = true;
		callback(new Error("importModule is hanging"));
	}, 2000);
};
