const { touch } = require("../side-effect-counter");

touch();

module.exports.f = function () {
	return "func";
};
module.exports.T = class T {
	constructor() {
		this.x = 1;
	}
}
