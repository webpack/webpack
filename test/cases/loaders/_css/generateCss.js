var fs = require("fs");
var path = require("path");
module.exports = function() {
	return {
		code: fs.readFileSync(path.join(path.dirname(__filename), "stylesheet.css"), "utf-8") + "\n.generated { color: red; }"
	};
};
