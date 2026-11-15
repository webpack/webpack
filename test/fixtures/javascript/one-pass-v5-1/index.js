function pick(flag) {
	var value;
	if (flag) {
		value = "yes";
	} else if (flag === 0) {
		value = "zero";
	} else {
		value = "no";
	}
	return value + "!";
}
console.log(pick(1), pick(0), pick(""));
function partial(flag) {
	var value;
	if (flag) value = "set";
	return value;
}
console.log(partial(1), partial(0));
function more(flag) {
	var value;
	if (flag) {
		value = 1;
		for (var key in flag) console.log(key);
	} else value = 2;
	return value;
}
console.log(more({ a: 1 }), more(0));
function other(flag, box) {
	var value;
	if (flag) value = 1;
	else box.value = 2;
	return value;
}
console.log(other(1, {}), other(0, {}));
function adds(flag) {
	var value;
	if (flag) value = 1;
	else value += 2;
	return value;
}
console.log(adds(1), adds(0));
function calls(flag) {
	var value;
	if (flag) value = 1;
	else console.log("calls");
	return value;
}
console.log(calls(1), calls(0));
function exits(flag) {
	var value;
	if (flag) value = 1;
	else return 2;
	return value;
}
console.log(exits(1), exits(0));
function commented(flag) {
	var value;
	if (flag) value = 1; /*! kept */
	else value = 2;
	return value;
}
console.log(commented(1), commented(0));
