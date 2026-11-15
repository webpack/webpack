import leftHelix from "./leftHelix";
import rightHelix from "./rightHelix";

it("import-circle: should import generate ensure function for this", () => {
	return Promise.all([leftHelix.run(), rightHelix.run()]);
});

export default {
	leftHelix,
	rightHelix
};
