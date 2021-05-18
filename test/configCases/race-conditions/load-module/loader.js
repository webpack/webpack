/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();
	let finished = false;
	this.loadModule("./module.js", (err, result) => {
		if (err) return callback(err);
		if (finished) return;
		finished = true;
		callback(null, `module.exports = ${JSON.stringify(result)};`);
	});
	setTimeout(() => {
		if (finished) return;
		finished = true;
		callback(new Error("loadModule is hanging"));
	}, 2000);
};
