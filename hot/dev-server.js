if(module.hot) {
	function check() {
		module.hot.check(function(err, updatedModules) {
			if(err) {
				if(module.hot.status() in {abort:1,fail:1})
					window.location.reload();
				else
					console.warn("Update failed: " + err);
				return;
			}

			if(!updatedModules)
				return console.log("No Update found.");

			check();

			if(!updatedModules || updatedModules.length === 0)
				return console.log("Update is empty.");
			console.log("Updated modules:");
			updatedModules.forEach(function(moduleId) {
				console.log(" - " + moduleId);
			});

		});
	}
	window.onmessage = function(event) {
		if(event.data === "webpackHotUpdate" && module.hot.status() === "idle") {
			check();
		}
	};
}