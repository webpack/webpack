/*#__NO_SIDE_EFFECTS__*/
function fn1(args) {
	return args;
}

/*@__NO_SIDE_EFFECTS__*/
function fn2(args) {
	return args;
}

/*@__NO_SIDE_EFFECTS__*/
const fn3 = (args) => {
	return args;
};

var fn4 = /*@__NO_SIDE_EFFECTS__*/ (args) => {
	return args;
};

fn1();
fn2();
fn3();
fn4();
