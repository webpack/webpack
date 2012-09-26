var child_process = require("child_process");

function Workers(moduleToFork, count) {
	this.nextId = 1;
	this.workers = [];
	this.forkedWorkers = [];
	this.workersJobs = [];
	this.callbacks = {};
	for(var i = 0; i < count; i++) {
		var worker = child_process.fork(moduleToFork);
		this.bindWorker(worker, i);
	}
}
module.exports = Workers;

Workers.prototype.run = function() {
	var args = Array.prototype.slice.call(arguments, 0);
	var worker = -1;
	var minJobs = -1;
	this.workersJobs.forEach(function(jobs, idx) {
		if(jobs < minJobs || minJobs == -1) {
			minJobs = jobs;
			worker = idx;
		}
	});
	if(worker < 0) throw new Error("Not ready! Check workers.ready().");
	this.workersJobs[worker]++;
	args.unshift(this.workers[worker]);
	this.pushJob.apply(this, args);
}

Workers.prototype.bindWorker = function(worker, idx) {
	worker.send(null);
	worker.once("message", function(msg) {
		if(msg == "ready") {
			idx = this.workers.length;
			this.workers.push(worker);
			this.workersJobs.push(0);
			worker.on("message", function(result) {
				this.workersJobs[idx]--;
				var id = result.shift();
				var callback = this.callbacks[id];
				delete this.callbacks[id];
				callback.apply(null, result);
			}.bind(this));
		} else {
			worker.disconnect();
			this.forkedWorkers.splice(idx, 1);
		}
	}.bind(this));
}

Workers.prototype.ready = function() {
	return this.workers.length > 0;
}

Workers.prototype.pushJob = function(worker) {
	var args = Array.prototype.slice.call(arguments, 0);
	var callback = args.pop();
	var id = this.nextId++;
	this.callbacks[id] = callback;
	args[0] = id;
	worker.send(args);
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