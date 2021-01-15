const expectWarning = require("../../../helpers/expectWarningFactory")();
const getInner = require("./module");

it("should print correct warning messages when a disposed module is required", done => {
	NEXT(
		require("../../update")(done, true, () => {
			getInner();
			expectWarning(
				/^\[HMR] unexpected require\(\.\/a.js\) from disposed module \.\/module\.js$/,
				/^\[HMR] unexpected require\(\.\/a.js\) to disposed module$/
			);
			const getInnerUpdated = require("./module");
			getInnerUpdated();
			expectWarning();
			done();
		})
	);
});

if (module.hot) {
	module.hot.accept("./module");
}
