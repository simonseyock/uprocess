﻿uprocess
========

A simple preprocessor written in JavaScript that supports include, define, undefine, ifdef, ifndef, warning and error.

It takes a file and an object containing defines and returns the processed file as a string. Note that like in C# a preprocessor variable can only be either define or not defined. If you try to assign it a value, that values is ignored.

Intended uses are writing a build script which creates individualised builds of a program, including source files into other source files, and making sure that certain files are not included more than once.

Motivation
----------

We tried other preprocessors but found that they were either broken or way too complex to be sure what they do. We wanted to use a preprocessor which works and which is easy to understand. It should be **very** clear what it does and what it doesn't. We want the program to do exactly what the documentation says so please inform us about any behaviour inconsistent with documentation (even if you find that deviation useful).

Commands
--------
Before, after and in between all elements of the expression may occur as much whitespace as wished, but no newlines. Elements of an expression are ``//``, ``#keyword`` and dependent on the command either ``textwithnowhitespace``, ``"text with no double-quotes"`` or no other element.

* include
  ```javascript
  // #include "some/file.js"
  ```
  This command takes the text from the specified file (path relative to the parsed file), processes it text and replaces itself by the output. Processing of the current file then is recommenced at the next line. Includepaths are relative to the file they are, in case of text passed directly to processText they are relative to the given includeDir.
 
* define, undefine
  ```javascript
  // #define FLAG
  ```
  This command adds FLAG to the list of defines, removes the line it is in and continues to parse. ``#undefine`` removes the given name from defines.
 
* ifdef, ifndef
  ```javascript
  // #ifndef FLAG
  some code
  // #endif
  ```
  When the Preprocessor reaches this line it checks if the condition is met (if the following name is defined (``#ifdef``) or not defined (``#ifndef``)). If it is met, it removes the line it is in and continues to parse. When the corresponding ``#endif`` line is encountered, that line is removed, too. Otherwise it removes all lines from up to and including the corresponding ``#endif`` and continues to parse with the line following said ``#endif``.

* warning, error
  ```javascript
  // #warning "The programm is still missing some functionality, don't deliver!"
  ```
  A warning is printed to the console via ``console.warn()`` prepended with ``"Preprocessor warning: "``. Likewise, ``#error`` raises an error message that is prepended with ``"Preprocessor error: "`` which means that the preprocessing is canceled once the preprocessor reaches this point.


Installation
------------

You can install this package via `npm install uprocess` or copy the repository folder to your node_modules folder.


Usage
-----

Typical usage example:

  ```javascript
  var uprocess = require("uprocess");
  var processed = uprocess.processFile("some/file.js", { SMALL: true });
  ```
  
Neither you can use this tool in the browser, nor can you use it from the command line, yet. To use it you need to write it into a file. How it's done (with fs):

  ```javascript
  var fs = require("fs");
  fs.writeFile("some/file.processed.js", processed);
  ```

Tips & Tricks
-------------

* Include a file only once, even if it is stated in several include statements

  Use C style, i.e. surround every file you want to include once with statements like this (inside the file):
  ```javascript
  // #ifndef __FILENAME__
  // #define __FILENAME__
  
  //Here comes the regular text of the file.
  function somefunc(param) {
    return param + param;
  }
  
  // #endif
  ```
  What you use as the define (``__FILENAME__``) should be unique for the whole project!
  
* Creating a build-script might be useful

  File: build.js
  ```javascript
  var fs = require("fs");
  var uprocess = require("uprocess");
  
  var startFile = "some/file.unprocessed.js";
  var outFile = "some/file.js"
  var defines = {
	SMALL: true,
	MOBILE: false
	};
	
  fs.writeFileSync( outFile, uprocess.processFile(startFile, defines) );
  ```
  
  Then you can easily invoke it with ``node build.js`` from the commandline!

API
---

The module provides the following functions and variables:

* ``uprocess.processFile(filePath, extDefines)``

  ``filePath`` is a path to a file the content of which is to be processed. ``extDefines`` is an object containing external defines which affect the processing as if they were set via the ``#define`` command. Includepaths are relative to the path to the file they occur in.

* ``uprocess.processText(text, extDefines, includeDir)``

  ``text`` is a string to be processed. ``extDefines`` is an object containing external defines which affect the processing as if they were set via the ``#define`` command. ``includeDir`` is the directory all includes inside the text are made relative to. Includepaths inside of included files are relative to the path to the file file they occur in.

* ``uprocess.DEBUG``

  If this flag is set to true, uprocess prints debug information to stdout (begin and end of files, defines).

* ``uprocess.endLineDelimiter``

  Changing this string will change the ends of all lines in the result - irrespective of the original line ends.

Command Line Interface
----------------------

Usage: ``uprocess [options] [<file>]`` (or ``node_modules/.bin/uprocess [options] [<file>]``).

It can read a text from standard output or from a given file (not both). It can output to stdout or a specified file.

Options:

    -h, --help                 output usage information
    -d, --defines [value]      Defines used for the preprocessing. Either a JSON string or a JSON file.
    -o, --output [value]       A file to write the output to
    -i, --includePath [value]  A path to look for includes. Required if using stdin.

Documentation
-------------

You might want to check the code.

Known issues
------------

* Preprocessor-commands inside strings will cause problems.

  If you check the regular expressions in the source code of uprocess, you might notice that certain kind of strings might cause problems with uprocess. If you would like to use code like ``var str = "Hell! //#define var";`` the script will produce invalid javascript (i.e. this line would evaluate to ``var str = "Hell! `` without ending quotes and semicolon) . 
