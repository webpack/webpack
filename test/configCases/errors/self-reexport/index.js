it("should not crash on incorrect exports", function() {
	if(Math.random() < -1) {
		import(/* webpackChunkName: "a" */ "./aa");
		import(/* webpackChunkName: "b" */ "./bb");
		import(/* webpackChunkName: "c" */ "./cc");
	}
});
