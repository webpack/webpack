var join = function () {};
{
	var first = 1,
		second = [first];
}
function counted(list) {
	var total = 0;
	if (true) {
		var seen = list.length;
		total += seen;
	}
	var last = list[seen - 1];
	return [total, last];
}
function gather(list) {
	var out = list.slice(0, 0);
	add();
	function add() {
		var limit = list.length - 1;
		list.forEach(function (item, index) {
			if (index < limit) out.push(item);
		});
		console.log(out);
	}
}
console.log(join(), first, second, counted([1, 2]));
gather([3, 4, 5]);
