var first = function () {
	global.entrySeparatorCalls = (global.entrySeparatorCalls || 0) + 1;
	return function () {};
}
// a trailing comment that ends in ;
