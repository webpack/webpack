export default class MyWorker {
	_worker;

	constructor(url) {
		const objectURL = URL.createObjectURL(
			new Blob([`importScripts(${JSON.stringify(url.toString())});`], {
				type: 'application/javascript'
			})
		);
		this._worker = new Worker(objectURL, { originalURL: url });
		URL.revokeObjectURL(objectURL);
	}

	getWorker() {
		return this._worker;
	}
}
