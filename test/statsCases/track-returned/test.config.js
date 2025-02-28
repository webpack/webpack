module.exports = {
	validate(stats) {
		expect(stats.compilation.modules.size).toBe(8);
	}
};
