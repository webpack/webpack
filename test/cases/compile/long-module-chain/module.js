if(__resourceQuery === "?0") {
	module.exports = "module";
} else {
	module.exports = require("./module?" + (+__resourceQuery.substr(1) - 1));
}
