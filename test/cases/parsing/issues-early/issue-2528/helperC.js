module.exports = {
	wrap: function(fn) {
		return function() {
			var context = { prev: 0, next: 0, stop: function() { this.next = "end"; } };
			while(context.next !== "end")
				fn(context);
		}
	}
}
