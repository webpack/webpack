var versionCheck = require("./check-version");

var checkResults = versionCheck();
if(checkResults) {
	console.log(checkResults);
}
