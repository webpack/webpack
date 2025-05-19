const path = require("path");

module.exports = {
	resolveModule(module, i) {
		if (/^\.\/bundle/.test(module)) {
			return module;
		}

		if (i === 4 || i === 5) {
			return `./${module}`;
		}

		if (i === 6 || i === 7 || i === 10 || i === 11) {
			if (/async/.test(module)) {
				return `../${module}`;
			}

			return `./${module}`;
		}

		if (i === 15) {
			return `./${path.basename(module)}`;
		}

		return module;
	},
	findBundle(i, options) {
		switch (i) {
			case 2:
			case 6:
			case 10: {
				return `./${options.output.filename}`;
			}
			case 3:
			case 7:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15: {
				return `./bundle${i}/${options.output.filename}`;
			}
			default: {
				return `./${options.output.filename}`;
			}
		}
	}
};
