const {exec} = require('child_process');


function runCommand(command) {
	exec(command, (err, data) => {
		if(data) {
			console.log(data);
		} else {
			console.log(err);
		}
	});
}

let webpackCliInstalled = false;
try {
	require.resolve("webpack-cli");
	webpackCliInstalled = true;
} catch (e) {
	webpackCliInstalled = false;
}

if (webpackCliInstalled) {
	require("webpack-cli"); // eslint-disable-line node/no-missing-require, node/no-extraneous-require, node/no-unpublished-require
} else {
	const path = require('path');
	const fs = require('fs');
	const isYarn = fs.existsSync(path.resolve(process.cwd(), 'yarn.lock'));
	const {prompt} = require('inquirer');
	let command;
	
	
	const question = {
		type: 'confirm',
		name: 'shouldInstall',
		message: 'Would you like to install webpack-cli?',
		default: true
	}

	if(isYarn){
		command = 'yarn add webpack-cli -D';
	}else{
		command = 'npm install --save-dev webpack-cli';
	}
	
	console.error("The CLI moved into a separate package: webpack-cli.");
	prompt(question).then((anwswer) => {
		if(answer){
			console.error('Installing webpack-cli')
			runCommand(command);
		}
	})
	
	console.error("Please install 'webpack-cli' in addition to webpack itself to use the CLI.");
	console.error("-> When using npm: npm install webpack-cli -D");
	console.error("-> When using yarn: yarn add webpack-cli -D");
	process.exitCode = 1;
}
