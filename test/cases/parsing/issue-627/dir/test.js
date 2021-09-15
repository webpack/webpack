expect(function() {
	var expr1 = "a", expr2 = "b";
	require(Math.random() < 0.5 ? expr1 : expr2);
}).toThrowError();
