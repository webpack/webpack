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
ended();
kept();
