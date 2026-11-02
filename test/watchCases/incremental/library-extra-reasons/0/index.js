const value = require("./value.js");

it("should retain distinct library reasons without accumulating duplicates", () => {
	expect(value).toBe(WATCH_STEP);
});

module.exports = value;
