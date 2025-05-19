module.exports = {
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
			case 14: {
				return `./bundle${i}/${options.output.filename}`;
			}
			default: {
				return `./${options.output.filename}`;
			}
		}
	}
};
