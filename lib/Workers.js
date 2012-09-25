var child_process = require("child_process");

function Workers(moduleToFork, count) {
	this.nextId = 1;
	this.jobs = [];
	this.freeWorkers = [];
	this.workers = [];
	this.callbacks = {};
	for(var i = 0; i < count; i++) {
		var worker = child_process.fork(moduleToFork);
		this.workers.push(worker);
		this.freeWorkers.push(worker);
		this.bindWorker(worker);
	}
}
module.exports = Workers;

Workers.prototype.run = function(parameters, callback) {
	if(this.freeWorkers.length > 0)
		this.pushJob(this.freeWorkers.shift(), parameters, callback);
	else
		this.jobs.push([parameters, callback]);
}

Workers.prototype.bindWorker = function(worker) {
	worker.on("message", function(result) {
		if(Array.isArray(result)) {
			var id = result.shift();
			var callback = this.callbacks[id];
			delete this.callbacks[id];
			callback.apply(null, result);
		} else {
			if(this.jobs.length > 0) {
				var job = this.jobs.shift();
				this.pushJob(worker, job[0], job[1]);
			} else {
				this.freeWorkers.push(worker);
			}
		}
	}.bind(this));
}

Workers.prototype.pushJob = function(worker, parameters, callback) {
	var id = this.nextId++;
	this.callbacks[id] = callback;
	worker.send([id, parameters]);
}

Workers.prototype.close = function() {
	this.workers.forEach(function(worker) {
		worker.disconnect();
	});
	this.workers.length = 0;
}

Workers.prototype.toJSON = function() {
	return {};
}