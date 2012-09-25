var child_process = require("child_process");

function Workers(moduleToFork, count) {
	this.nextId = 1;
	this.workers = [];
	this.workersJobs = [];
	this.callbacks = {};
	for(var i = 0; i < count; i++) {
		var worker = child_process.fork(moduleToFork);
		this.workers.push(worker);
		this.workersJobs.push(0);
		this.bindWorker(worker, i);
	}
}
module.exports = Workers;

Workers.prototype.run = function(parameters, callback) {
	var worker = 0;
	var minJobs = -1;
	this.workersJobs.forEach(function(jobs, idx) {
		if(jobs < minJobs || minJobs == -1) {
			minJobs = jobs;
			worker = idx;
		}
	});
	this.workersJobs[worker]++;
	this.pushJob(this.workers[worker], parameters, callback);
}

Workers.prototype.bindWorker = function(worker, idx) {
	worker.on("message", function(result) {
		this.workersJobs[idx]--;
		var id = result.shift();
		var callback = this.callbacks[id];
		delete this.callbacks[id];
		callback.apply(null, result);
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