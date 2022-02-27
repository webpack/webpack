/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 2,
			errors: true
		}
	},
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
			errorsSpace: 100,
			errors: true
		}
	}
];
