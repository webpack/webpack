const fs = require("fs");

module.exports = {
	noTests: true,
	findBundle: function (i, options) {
		const regex = new RegExp(`^bundle.${options.name}`, "i");
		const files = fs.readdirSync(options.output.path);
		const bundle = files.find(function (file) {
			return regex.test(file);
		});

		if (!bundle) {
			throw new Error(
				`No file found with correct name (regex: ${
					regex.source
				}, files: ${files.join(", ")})`
			);
		}

		return `./${bundle}`;
	}
};
