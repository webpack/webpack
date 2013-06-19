if(module.hot) {
	var hotPollInterval = +(__resourceQuery.substr(1)) || (10*60*1000);
	setInterval(function() {
		if(module.hot.status() === "idle") {
			module.hot.check(function(err, updatedModules) {
				if(err) {
					console.warn("Update failed: " + err);
					return;
				}
			});
		}
	}, hotPollInterval);
}