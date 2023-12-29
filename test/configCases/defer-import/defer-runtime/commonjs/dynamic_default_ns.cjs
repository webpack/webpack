const { touch } = require("../side-effect-counter");

touch();

module.exports = function () {
	return "func";
};
