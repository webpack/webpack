function caught() {
	try {
		var unused = 1;
	} catch (error) {}
	return 2;
}
function caughtVar() {
	try {
		var unused = 1;
	} catch (error) {
		var kept;
	}
	return kept;
}
function finished() {
	try {
		var unused = 1;
	} finally {
		done();
	}
	return 2;
}
function throwing() {
	try {
		var unused = read;
	} catch (error) {}
	return 2;
}
caught();
caughtVar();
finished();
throwing();
