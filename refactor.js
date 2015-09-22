var path = require('path');
var fs = require('fs');
 
var rootPath = './';

var namespacenames = [
	'synth',
	'synth.module'
];

/**
 * @typedef {Object} IndexEntry
 * @property {string} type - either 'class' or 'namespace'
 * @property {string} path - path to the file
 * @property {string} oldName - the old name of the module
 * @property {boolean} doRefactor
 */
var modules = [
	{
		newName: 'AmountModule',
		path: 'modules/Amount.js',
		type: 'class',
		oldName: 'synth.module.Amount',
		doRefactor: true
	},
	{
		newName: 'Module',
		path: 'modules/Module.js',
		type: 'class',
		oldName: 'synth.module.Module',
		doRefactor: true
	}
];

var inheritsPattern = "synth\\.inherits\\([^,]*?, ([^)]*?)\\);";

function requirefy(p) {
	p = (p[0] !== '.')? './' + p: p; // makes path relative (not really sure if needed, can't harm)
	p = p.replace(new RegExp('\\\\', 'g'), '/'); // replaces every \ ;)
	p = p.substr(0, p.length-3); // removes .js
	return p;
}

var newline = '(?:\\n\\r|\\r\\n|\\n|\\r)';

/**
 * @typedef {Object} JSDocLine
 * @property {string} tag
 * @property {string} type
 * @property {string} varName
 * @property {string} text
 */

function parseJSDocString(jsdocString) {
	var jsdocLines = [];
	
	if (jsdocString) {
		jsdocString = jsdocString.match(new RegExp('\\/\\*\\*\\s*([\\S\\s]*?)\\s*\\*\\/', 'm'))[1];
		
		jsdocString.split(new RegExp(newline, 'm')).forEach(function (line) {
			line = line.match('(?:\\s*\\*)?\\s*(.*)$')[1];
			
			var tag = line.match('@(\\w*)');
			var jsdocLine = {};
			
			if (tag) {
				jsdocLine.tag = tag[1];
				var typePattern = '\\{(.*?)\\}(?!.*\\})';
				var type = line.match(typePattern);
				if (type) {
					jsdocLine.type = type[1];
					var restPattern = typePattern + '\\s*(\\w*)\\s*(.*)$';
					var result = line.match(restPattern);
					if (result[2]) {
						jsdocLine.varName = result[2];
					}
					if (result[3]) {
						jsdocLine.text = result[3];
					}
				}
				else {
					var text = line.match(tag + '\\s*(.*?)$');
					if (text && text.length > 2) {
						jsdocLine.text = text[2];
					}
				}
			} else {
				jsdocLine.text = line;
			}
			
			jsdocLines.push(jsdocLine);
		});
	}
	
	var retObj = {
		remove: function (pattern) {
			for (var i=jsdocLines.length-1; i >=0; i--) {
				if (jsdocLines[i].tag && jsdocLines[i].tag.match(pattern)) {
					jsdocLines.splice(i, 1);
				}
			}
			return retObj;
		},
		add: function (jsdocLine) {
			jsdocLines.push(jsdocLine);
			return retObj;
		},
		generate: function () {
			var result = '/**\n';
			jsdocLines.forEach(function (jsdocLine) {
				result += ' *';
				if (jsdocLine.tag) {
					result += ' @' + jsdocLine.tag;
					if (jsdocLine.type) {
						result += ' {' + jsdocLine.type + '}';
						if (jsdocLine.varName) {
							result += ' ' + jsdocLine.varName;
						}
					}
				}
				if (jsdocLine.text) {
					result += ' ' + jsdocLine.text;
				}
				result += '\n';
			});
			result += ' */\n';
			return result;
		}
	};
	
	return retObj;
}


// TODO: Add some jsdoc magic for webstorm

modules.forEach(function (module) {
	if (module.doRefactor) {
		var filePath = path.join(rootPath, module.path);
		var fileText = fs.readFileSync( filePath, "utf-8" );

		if (module.type === 'class') {
			var matches;
			var constructor;
			var inheritances = [];
			var methods = [];
			
			// remove surrounding ifndef (assuming they are in the first 2 and the last line)
			
			// first ifndef
			fileText = fileText.replace(new RegExp('^.*?#ifndef.*?' + newline, 'm'), '');
			
			// first define
			fileText = fileText.replace(new RegExp('^.*?#define.*?' + newline, 'm'), '');
			
			// last endif
			fileText = fileText.replace(new RegExp('^.*?#endif.*?$(?![\\s\\S]*?#endif)' + newline, 'm'), '');
			
			// remove namespace definitions
			
			namespacenames.forEach(function (ns) {
				fileText = fileText.replace(new RegExp(ns + ' = ' + ns + ' \\|\\| \\{\\};.*?' + newline, 'mg'), '');
			});
			
			// rename self
			
			if (!fileText.match(module.oldName)) {
				console.warn('oldName not found in module ' + module.newName);
			}
			
			fileText = fileText.replace(module.oldName, 'var ' + module.newName); // first occurance gets a var
			
			fileText = fileText.replace(new RegExp(module.oldName, 'g'), module.newName);
			
			
			// find occurances of other classes and create proper includes
			
			modules.forEach(function (moduleInside) {
				if(fileText.match(moduleInside.oldName)) {
					//create includes
					var includePath = path.relative(path.dirname(filePath), path.join(rootPath, moduleInside.path));
					fileText = "/** @type {" + moduleInside.newName + "} */\nvar " + moduleInside.newName + " = require('" + requirefy(includePath) + "');\n" + fileText;
					
					fileText = fileText.replace(new RegExp(moduleInside.oldName, 'g'), moduleInside.newName);
				}
			});
			
			// remove old includes
			
			fileText = fileText.replace(new RegExp('^.*?#include.*?' + newline, 'gm'), '');

			// reorganize inheritance
			
			var inheritsRegExp = new RegExp(inheritsPattern, 'gm');
			
			var inherits = [];
			
			var result;
			while((result = inheritsRegExp.exec(fileText)) !== null) {
				inherits.push(result[1]);
			}
			
			if (inherits.length > 0) {
				var inheritsString = "$.extend(" + module.newName + ".prototype";
				
				inherits.forEach(function (inherit) {
					inheritsString += ', ' + inherit + '.prototype';
				});
				
				inheritsString += ");";
				
				fileText = fileText.replace(new RegExp(inheritsPattern + newline, 'm'), inheritsString);
				
				fileText = fileText.replace(new RegExp(inheritsPattern + newline, 'gm'), '');
			}
			
			// create some jsdoc annotation
			
				// check if class already has jsdoc annotation and select it
				
				var classJsdocPattern = '\\/\\*\\*[\\s\\S]*?\\*\\/(?=\\s*var ' + module.newName + ')';
				var parsedJsdoc;
				var matchDoc = fileText.match(new RegExp(classJsdocPattern, 'm'));
				if (matchDoc) {
					parsedJsdoc = parseJSDocString(matchDoc[0]);
					parsedJsdoc.remove('(class)|(constructor)');
					parsedJsdoc.remove('(extends)|(augments)');
				} else {
					parsedJsdoc = parseJSDocString();
				}
				
				parsedJsdoc.add({
					tag: 'class'
				});
			
				inherits.forEach(function (inherit) {
					parsedJsdoc.add({
						tag: 'extends',
						type: inherit
					});
				});
				
				var generated = parsedJsdoc.generate();
				
				if (matchDoc) {
					fileText = fileText.replace(new RegExp(classJsdocPattern + '(' + newline + ')*', 'm'), generated);
				} else {
					fileText = fileText.replace(new RegExp(newline + '(?=var ' + module.newName + ')', 'm'), '\n' + generated);
				}
				
			
			// reorganize methods
			// note: ; in multiline comments will lead to errors
			var methodPattern = '((?:(?:\\/\\/.*?;.*?$)|[^;])*)^' + module.newName + '\\.prototype\\.(\\w*?) = ([\\s\\S]*?^\\};)';
			var methodRegExp = new RegExp(methodPattern, 'gm');
			
			var methods = [];
			
			var result;
			while ((result = methodRegExp.exec(fileText)) !== null) {
				methods.push({
					preText: result[1],
					name: result[2],
					body: result[3].substr(0, result[3].length-1) // cut off ;
				});
			}
			
			if (methods.length > 0) {
				
				var methodsString = "\n\n$.extend(" + module.newName + ".prototype, /** @lends " + module.newName + ".prototype */ {\n";
				
				methods.forEach(function (method) {
					methodsString += method.preText + method.name + ': ' + method.body + ',';
				});
				
				methodsString = methodsString.substr(0, methodsString.length-1); // cut off last ,
				methodsString += "\n});";
				
				fileText = fileText.replace(new RegExp(methodPattern + newline, 'm'), methodsString);
				
				fileText = fileText.replace(new RegExp(methodPattern + newline, 'gm'), '');
			}
			
			
			// replace ifdefs by hand with has.js only reasonable way
			
			matches = fileText.match(new RegExp('(#ifndef)|(#ifdef)|(#define)', 'g'));
			
			if (matches) {
				console.log('The file still cointains ' + matches.length + ' #ifdef, #ifndef and #define expressions');
			}
			
			// surround with define block and return type
			
			fileText = 
				"define(function (require) {\n"
				+ fileText
				+ "\nreturn "+module.newName+";\n});";
		}
		
		module.text = fileText;
	}
});

// if all files are processed without errors, write them

modules.forEach(function(module) {
	fs.writeFileSync(module.path, module.text);
});