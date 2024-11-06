/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 0,
			errors: true
		}
	},
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 2, // 2 errors (2 errors without details)
			errors: true
		}
	},
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 3, // 2 errors (2 errors without details)
			errors: true
		}
	},
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 4, // 2 errors + 2 lines (2 errors, one with partial details)
			errors: true
		}
	},
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 5, // 2 errors + 3 lines (2 errors, one full details)
			errors: true
		}
	},
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 100,
			errors: true
		}
	}
];
