it("should find var declaration later in code", function() {
	(typeof require).should.be.eql("undefined");

	var require;
});

it("should find var declaration in same statement", function() {
	var fn = (function() {
		require("fail");
	}), require;

	require = (function(x) {
		x.should.be.eql("fail");
	});
	fn();
});

it("should find a catch block declaration", function() {
	try {
		var f = (function(x) {
			x.should.be.eql("fail");
		});
		throw f;
	} catch(require) {
		require("fail");
	}
});

it("should find var declaration in control statements", function() {
	var f = (function(x) {
		x.should.be.eql("fail");
	});

	(function() {
		{
			var require = f;
		}

		require("fail");
	}());

	(function() {
		var i = 1;
		while(i--) {
			var require = f;
		}

		require("fail");
	}());

	(function() {
		do {
			var require = f;
		} while(false);

		require("fail");
	}());

	(function() {
		for(var i = 0; i < 1; i++) {
			var require = f;
		}

		require("fail");
	}());

	(function() {
		for(var i in {a:1}) {
			var require = f;
		}

		require("fail");
	}());

	(function() {
		with({ a: 1 }) {
			var require = f;
		}

		require("fail");
	}());
});

it("should find var declaration in control statements after usage", function() {
	var f = (function(x) {
		x.should.be.eql("fail");
	});

	(function() {
		var test = (function() { require("fail"); });

		{
			var require = f;
		}

		test();
	}());

	(function() {
		var test = (function() { require("fail"); });

		var i = 1;
		while(i--) {
			var require = f;
		}

		test();
	}());

	(function() {
		var test = (function() { require("fail"); });

		do {
			var require = f;
		} while(false);

		test();
	}());

	(function() {
		var test = (function() { require("fail"); });

		for(var i = 0; i < 1; i++) {
			var require = f;
		}

		test();
	}());

	(function() {
		var test = (function() { require("fail"); });

		for(var i in {a:1}) {
			var require = f;
		}

		test();
	}());

	(function() {
		var test = (function() { require("fail"); });

		with({ a: 1 }) {
			var require = f;
		}

		test();
	}());
});
