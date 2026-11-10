global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat(
	"config"
);

// not statically known, so it cannot be inlined away along with the edge
export const config = global.__nestedConcatSeed || "root";
