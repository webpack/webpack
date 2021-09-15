module.exports = (m) => {
	m.hot && m.hot.accept();
	return self => self;
};
