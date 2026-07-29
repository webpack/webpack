let count = 0;
module.exports = {
	used: "used",
	unused: (++count, "unused"),
	getCount() {
		return count;
	}
};
