exports.b = require("./cycle-b");
exports.value = function () {
	return exports.b.x;
};
