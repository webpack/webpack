exports.x = 3;
exports.peer = function () {
	return require("./cycle-a");
};
