// A function of an empty body passed to a parameter called once stays where
// it is passed: moved there, its call would print as `()`.
function once(run) {
	run();
}
once(function () {});
(function (run) {
	run();
})(function () {});
(function (run) {
	run();
	console.log("after");
})(() => {});
