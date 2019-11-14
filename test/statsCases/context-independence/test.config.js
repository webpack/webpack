module.exports = {
	validate(stats) {
		const a = stats.stats[0].compilation.hash;
		const b = stats.stats[1].compilation.hash;
		expect(a).toBe(b);
		const c = stats.stats[2].compilation.hash;
		const d = stats.stats[3].compilation.hash;
		expect(c).toBe(d);
	}
};
