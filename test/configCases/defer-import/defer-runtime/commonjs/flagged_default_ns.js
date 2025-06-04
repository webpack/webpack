const { touch } = require("../side-effect-counter");

module.exports.__esModule = true;
module.exports.default = f;

function f() {
	return "func";
}

touch();
