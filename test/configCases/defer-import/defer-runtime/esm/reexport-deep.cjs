const { touch } = require("../side-effect-counter");

function f() {
	return "func";
}

touch();
module.exports.f = f;
module.exports.T = class T {
	constructor() {
		this.x = 1;
	}
}
