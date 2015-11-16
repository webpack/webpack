var callback;

module.hot.accept();
module.hot.dispose(function(data) {
	data.callback = callback;
});

module.exports = function(cb) {
	callback = cb;
}

---

module.hot.data.callback();
