// This module is not accepted nor declined.
// Any change will make the update fail.
// If running in webpack-dev-server, it will do a complete reload on abort or fail.

window.onload = function() {

	if(module.hot) {

		var checkButton = document.createElement("button");
		checkButton.innerText = "Update!";
		checkButton.onclick = function() {
			module.hot.check(function(err, updatedModules) {
				if(err) {
					if(module.hot.status() in {abort:1,fail:1})
						window.location.reload();
					else
						console.warn("Update failed: " + err);
					return;
				}

				if(!updatedModules || updatedModules.length === 0)
					return console.log("Update is empty.");
				console.log("Updated modules:");
				updatedModules.forEach(function(moduleId) {
					console.log(" - " + moduleId);
				});
			});
		};
		document.body.appendChild(checkButton);
	}

	var element1 = document.createElement("div");
	element1.innerHTML = require("./html.js");
	document.body.appendChild(element1);

	var element2 = require("./element.js");
	document.body.appendChild(element2);

	require("./style.js");

	require("./applyStyle2");

	if(module.hot) {

		module.hot.accept("./html.js", function() {
			console.log("Replacing 'html.js' in 'index.js'");
			element1.innerHTML = require("./html.js");
		});

		module.hot.accept("./element.js", function() {
			document.body.removeChild(element2);
			console.log("Replacing 'element.js' in 'index.js'");
			element2 = require("./element.js");
			document.body.appendChild(element2);
		});

		module.hot.accept("./applyStyle2", function() {
			require("./applyStyle2");
		});

	}
};