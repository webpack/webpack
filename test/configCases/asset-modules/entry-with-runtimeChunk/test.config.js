module.exports = {
	findBundle(i, options) {
		const ext = options.output.module ? "mjs" : "js";

		switch (i % 4) {
			case 0:
				return ["test.js", `${i}/runtime~app.${ext}`];
			case 1:
				return ["test.js", `${i}/app.${ext}`, `${i}/runtime~app.${ext}`];
			case 2:
				return ["test.js", `${i}/app.${ext}`, `${i}/runtime~app.${ext}`];
			case 3:
				return [
					"test.js",
					`${i}/entry1.${ext}`,
					`${i}/entry2.${ext}`,
					`${i}/runtime~entry1.${ext}`,
					`${i}/runtime~entry2.${ext}`
				];
			default:
				break;
		}
	}
};
