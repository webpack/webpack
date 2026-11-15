export default function runSecondChunkUpdate() {
	const log = [];
	(function () {
		let secondChunkUpdate = 1;
		secondChunkUpdate++;
		log.push("second-chunk-ran");
	})();
	return log;
}
