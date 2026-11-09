// sloppy-mode only: parsing it as a module fails, so it is read as a script
exports.read = function (object) {
	with (object) {
		return x;
	}
};
