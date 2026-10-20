module.exports = {
	value: 1,
	read: function () {
		return exports;
	}
};
exports.original = true;
