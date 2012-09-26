var child_process = require("child_process");

function Workers(moduleToFork, count) {
	this.nextId = 1;
	this.workers = [];
	this.workersRegister = [];
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
	args.unshift(worker);
	this.pushJob.apply(this, args);
}

Workers.prototype.bindWorker = function(worker, idx) {
	worker.send(null);
	worker.once("message", function(msg) {
		if(msg == "ready") {
			idx = this.workers.length;
			this.workers.push(worker);
			this.workersJobs.push(0);
			this.workersRegister.push({});
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
	this.workersJobs[worker]++;
	for(var i = 2; i < args.length; i++)
		args[i] = JSON.stringify(args[i]);
	var reg = this.workersRegister[worker][args[1]];
	var regMapping = null;
	var newValues = args.slice(2);
	this.workersRegister[worker][args[1]] = newValues;
	if(reg && newValues.length == reg.length) {
		regMapping = [];
		for(var i = 0; i < reg.length; i++) {
			var match = reg[i] == newValues[i];
			regMapping.push(match);
			if(match) args[i+2] = null;
		}
	}
	args.splice(2, 0, regMapping);
	this.workers[worker].send(args);
}

Workers.prototype.close = function() {
	this.workers.forEach(function(worker) {
		worker.disconnect();
	});
	this.workers.length = 0;
	this.workersJobs.length = 0;
	this.workersRegister.length = 0;
}

Workers.prototype.toJSON = function() {
	return {};
}