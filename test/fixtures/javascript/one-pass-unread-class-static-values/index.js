var log = [];
var side = function (name) {
	log.push(name);
	return name;
};
(class {
	static foo = side("value");
	[side("method")]() {}
	[side("field")] = 4;
});
(class {
	static foo = {}[side("object")];
});
(class {
	static foo = this.name;
});
(class Named {
	static foo = Named.name;
});
(class {
	static foo = (log.written = 1);
});
console.log(log.join());
