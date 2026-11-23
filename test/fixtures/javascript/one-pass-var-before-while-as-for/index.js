function each(list, callback) {
	var i = 0;
	while (i < list.length) {
		callback(list[i++]);
	}
}
function eachOrOne(value, callback) {
	if (Array.isArray(value)) {
		var i = 0;
		while (i < value.length) {
			callback(value[i++]);
		}
	} else callback(value);
}
function countDown(n) {
	n--;
	while (n > 0) console.log(n--);
}
each([1, 2], console.log);
eachOrOne([3, 4], console.log);
eachOrOne(5, console.log);
countDown(3);
