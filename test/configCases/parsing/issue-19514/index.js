it("should compile and work", done => {
	function main() {
		if (!import.meta.webpackHot) {
			return;
		}
		if (import.meta.webpackHot.status() !== "idle") {
			console.log("idle");
		}
	}
	main();
	done();
});
