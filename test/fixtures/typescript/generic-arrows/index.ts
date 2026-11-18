const one = <T,>(value: T) => value;
const two = <T>(value: T): T => value;
const constrained = <T extends string = "a">(value: T) => value;
const asyncOne = async <T>(value: T) => value;
