function ended() {
	block: {
		for (;;) break block;
	}
	console.log("ended");
}
function kept() {
	block: {
		for (;;) break block;
		console.log("skipped");
	}
	console.log("kept");
}
function joined() {
	block: {
		console.log("first");
		for (;;) break block;
	}
}
function declared() {
	block: {
		for (var i = console.log("declared"); ; ) break block;
	}
	return [i, i];
}
ended();
kept();
joined();
declared();
