var never = false;

it("should suggest a similar file when a module is not found", function () {
	if (never) {
		require("./Componet.js");
		require("./Componet");
		require("./utlis");
		require("./tranlsatoins.js");
		require("./bundel");
		require("./nothing-like-this-here.js");
		require("./no-such-directory/Componet.js");
		require("./directory-without-index");
		require("/definitely-not-a-file-in-the-filesystem-root.js");
	}
});
