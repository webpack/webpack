var never = false;

it("should look in every configured module directory", function () {
	if (never) {
		require("widgets/Chart.js");
		require("Widgets/chart.js");
		require("Widgets/chart");
		require("nothing-like-this-at-all/Chart.js");
	}
});
