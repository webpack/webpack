const { touch } = require("../side-effect-counter");

module.exports.__esModule = true;
module.exports.f = f;
module.exports.T = class T {
	constructor() {
		this.x = 1;
	}
}

function f() {
	return "func";
}

touch();
