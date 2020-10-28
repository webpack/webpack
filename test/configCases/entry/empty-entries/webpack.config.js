/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		nonempty: ["./a.js"],
		empty: [],
		"empty-import-dependOn": {
			import: [],
			dependOn: []
		}
	}
};
