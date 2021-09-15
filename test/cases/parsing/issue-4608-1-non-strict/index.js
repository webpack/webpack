it("should find var declaration in control statements", function () {
	var f = function (x) {
		expect(x).toBe("fail");
	};

	(function () {
		with ({ a: 1 }) {
			var require = f;
		}

		require("fail");
	})();
});

it("should find var declaration in control statements after usage", function () {
	var f = function (x) {
		expect(x).toBe("fail");
	};

	(function () {
		var test = function () {
			require("fail");
		};

		with ({ a: 1 }) {
			var require = f;
		}

		test();
	})();
});
