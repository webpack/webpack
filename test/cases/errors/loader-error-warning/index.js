it("should emit the correct errors and warnings", function() {
	require("./error-loader?abc!./a");
	require("./error-loader?def!./a");
	require("./warning-loader?xyz!./a");
});
