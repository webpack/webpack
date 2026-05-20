const value = function value() {
	return 42;
};
value.named = "named-prop";
value.deep = { nested: "deep-value" };

export { value as "module.exports", value as named };
