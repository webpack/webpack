try {
	module.exports = require("./optional");
} catch (_error) {
	module.exports = "ignored";
}
