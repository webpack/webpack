module.exports.value = 1;
module.exports.default = 2;

it("should read a CommonJS entry's exports too", () => {
	expect(__STATS__.warnings).toHaveLength(1);
});
