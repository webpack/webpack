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
function lastFirst(list) {
	var i = list.length;
	while (i--) console.log(list[i]);
}
function countPositive(list) {
	var n = 0;
	while (
		n <
		list.filter(function (x) {
			return x-- > 0;
		}).length
	)
		n++;
	return n;
}
each([1, 2], console.log);
eachOrOne([3, 4], console.log);
eachOrOne(5, console.log);
countDown(3);
lastFirst([6, 7]);
console.log(countPositive([1, 0, 2]));
