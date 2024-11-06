/** @type {import("../../../../../").PitchLoaderDefinitionFunction} */
exports.pitch = async function (remaining) {
	const callback = this.async();
	const result = this.loadModule(
		`${this.resourcePath}.webpack[javascript/auto]!=!${remaining}`,
		(err, result) => {
			if (err) {
				callback(err);
				return;
			}

			callback(null, result)
		}
	);
};
