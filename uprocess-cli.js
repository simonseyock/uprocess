#!/usr/bin/env node

/*
 *					COMMAND LINE INTERFACE FOR UPROCESS
 */
	
(function () {

	var uprocess = require('./uprocess');

	var fs = require('fs');
	var path = require('path');
	
	var clArguments = require('commander')
		.usage('[options] [<file>]')
		.option('-d, --defines [value]', 'Defines used for the preprocessing. Either a JSON string or a JSON file.' )
		.option('-o, --output [value]', 'A file to write the output to')
		.option('-i, --includePath [value]', 'A path to look for includes. Required if using stdin.')
		.parse(process.argv);
	
	var fileName;
	var fileContent;
	var stdinData = "";
	var defines = {};
	var includePath;
	var outputFile;

	// fileName
	if (clArguments.args.length == 1) {
		fileName = clArguments.args[0];
		fileContent = fs.readFileSync(fileName, "utf-8");
	} else if (clArguments.args.length > 1) {
		throw new Error("Uprocess can't preprocess more than one (base-)file at the same time.");
	}

	// defines
	if (clArguments.defines) {
		var error = "";
		try {
			defines = JSON.parse(clArguments.defines);
		} catch (e) {
			if (fs.existsSync(clArguments.defines)) {
				try {
					var text = fs.readFileSync(clArguments.defines);
				} catch (e) {
					throw new Error("The file passed with option -d, --defines failed to open.");
				}
				try {
					defines = JSON.parse(text);
				} catch (e) {
					throw new Error("The file passed with option -d, --defines does not contain valid JSON.");
				}
			} else {
				throw new Error("The string passed with option -d, --defines is no valid JSON and is not a file that exists.");
			}
		}
	}

	// includePath
	if (clArguments.includePath) {
		includePath = clArguments.includePath;
	} else {
		if (fileName) {
			includePath = path.join(path.dirname(fileName));
		} else {
			console.warn("No include path given.");
			includePath = __dirname;
		}
	}

	//output
	var output = function (processed) {
		if (clArguments.output) {
			try {
				fs.writeFileSync(clArguments.output, processed);
			} catch (e) {
				throw new Error("Problems writing to the specified output file.");
			}
		} else {
			process.stdout.write(processed);
		}
	};

	//preprocess file
	if (fileContent) {
		output(uprocess.processText(fileContent, defines, includePath));
	}

	if(process.stdin) {
		// stdin		
		process.stdin.setEncoding('utf8');

		process.stdin.on('readable', function() {
		  var chunk = process.stdin.read();
		  if (chunk !== null) {
			stdinData += chunk;
		  }
		});

		process.stdin.on('end', function() {
			if(stdinData) {
				if (fileName) {
					throw new Error("Uprocess can't preprocess stdin and an input file at the same time.")
				} else {
					output(uprocess.processText(stdinData, defines, includePath));
				}
			}
		});
	}
})();