var truthy = (value) => Boolean(value),
	object = () => Boolean({});
console.log(truthy(0), truthy("a"), object());
