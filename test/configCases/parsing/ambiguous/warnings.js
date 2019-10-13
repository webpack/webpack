module.exports = [];

for (let i = 1; i <= 6; ++i) {
	module.exports.push([new RegExp(`amb${i}`), /ambiguous/]);
}
