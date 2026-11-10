var log = [];

function evaluated() {
	/*#__NO_SIDE_EFFECTS__*/
	var set = function () {};
	// eslint-disable-next-line no-eval
	eval("set = function () { log.push('eval'); };");
	set();
}

function scoped() {
	var holder = {
		called: function () {
			log.push("with");
		}
	};
	/*#__NO_SIDE_EFFECTS__*/
	var called = function () {};
	// eslint-disable-next-line no-with
	with (holder) {
		called();
	}
}

evaluated();
scoped();

it("should keep a call to a name `eval` or `with` may set otherwise", () => {
	expect(log).toEqual(["eval", "with"]);
});
