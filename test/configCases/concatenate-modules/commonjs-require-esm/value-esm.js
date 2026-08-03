const value = function value() {
	return 42;
};
value.named = "named-prop";

export { value as "module.exports", value as named };
