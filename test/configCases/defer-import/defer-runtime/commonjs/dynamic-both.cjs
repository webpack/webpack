const { touch } = require("../side-effect-counter");

touch();

module.exports = function () {
	return "func";
};
module.exports.x = 1;
module.exports.T = class T {
	constructor() {
		this.x = 1;
	}
}
