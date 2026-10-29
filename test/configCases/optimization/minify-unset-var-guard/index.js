var Direction = /* @__PURE__ */ (function (Direction) {
	Direction[(Direction.Forward = 1)] = "Forward";
	Direction[(Direction.Reverse = -1)] = "Reverse";
	return Direction;
})(Direction || {});

var Level;
(function (Level) {
	Level[(Level.Low = 0)] = "Low";
	Level[(Level.High = 1)] = "High";
})(Level || (Level = {}));

function lazy(make) {
	var cache;
	function get() {
		return cache || (cache = make());
	}
	return get() === get();
}

it("should write a `var` read before anything writes it as `undefined`, keeping one a closure reads", () => {
	expect([Direction.Forward, Direction[-1]]).toEqual([1, "Reverse"]);
	expect([Level.High, Level[0]]).toEqual([1, "Low"]);
	expect(lazy(() => ({}))).toBe(true);
});
