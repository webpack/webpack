module.exports = {
	a: 1,
	get b() {
		throw new Error("never read");
	},
	c: function () {}
};
