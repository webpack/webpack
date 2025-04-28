module.exports = {
	findBundle(i, options) {
		switch (i) {
			case 0:
				return [`bundle${i}.js`];
			case 1:
				return [`runtime.bundle${i}.js`, `main.bundle${i}.js`];
			case 2:
				return [`bundle${i}.mjs`];
			case 3:
				return [`runtime.bundle${i}.mjs`, `main.bundle${i}.mjs`];
		}
	}
};
