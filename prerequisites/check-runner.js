var versionCheck = require("./check-version");

[versionCheck].forEach(function(runCheck) {
	var checkResults = runCheck();
	if(checkResults) {
		console.log(checkResults);
	}
});
