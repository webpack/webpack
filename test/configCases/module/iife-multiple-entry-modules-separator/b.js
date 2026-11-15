(function () {
	global.entrySeparatorRan = true;
})()
var second = function () {
	global.entrySeparatorCalls = (global.entrySeparatorCalls || 0) + 1;
	return function () {};
}
