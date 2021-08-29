module.exports = {
	validate(stats) {
		for (let i = 0; i < stats.stats.length; i += 2) {
			const a = stats.stats[i].compilation.hash;
			const b = stats.stats[i + 1].compilation.hash;
			expect(a).toBe(b);
		}
	}
};
