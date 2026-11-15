var log = [];
var flag;

function track(value) {
	log.push(value);
	return value;
}

function booleans(c) {
	if (c) {
		flag = true;
	} else {
		flag = false;
	}
	return flag;
}

var named = function named() {
	var named = 1;
	return named;
};

var keptName = function keptName(read = keptName) {
	var keptName;
	return typeof read;
};

function branches(a) {
	if (a) typeof missing;
	if (track("test")) 1;
	else 2;
	return a;
}

function bare(c) {
	var a, b;
	if (c) return (a = 2) + (b = 3);
}

it("should print an `if` assigning opposite booleans as the test negated", () => {
	expect(booleans(2)).toBe(true);
	expect(booleans(0)).toBe(false);
});

it("should drop a function expression's name its body declares again", () => {
	expect(named()).toBe(1);
	expect(keptName()).toBe("function");
});

it("should drop an `if` branch running nothing, and print an unread number bare", () => {
	log.length = 0;
	expect(branches(1)).toBe(1);
	expect(log).toEqual(["test"]);
	expect(bare(1)).toBe(5);
});
