uprocess
========

A simple preprocessor written in javascript, supports include, define, undefine, ifdef, ifndef, warning and error.

It takes a file and an object with defines (values are ignored) and returns the processed file as a string. 

It can be used to make a build script which creates indivdualised builds of one software and it can be used to include files and control that they are only included once.

Motivation
----------

We found other preprocessors which where broken and others which seemed way to complex to be sure what they do.
We wanted to use a preprocessor which works and which is easy to understand. It should be **very** clear what it does and what it doesn't (i.e. it should do exactly what is said about it and the code should be clear). We will appreciate it if you inform us about any behaviour inconsistent with documentation.


Commands
--------
Before, after and in between all elements of the expression may occur as much whitespace as wished, but no newlines. Elements of an expression are ``//``, ``#keyword`` and dependent on the command either ``textwithnowhitespace``, ``"text with no double-quotes"`` or no other element.

* include
  ```javascript
  // #include "some/file.js"
  ```
  This command takes the text from the specified file (path relative to the parsed file), processes it and then puts it at its own position and continues with the first line after the included file. Includepaths are relative to the file they are in or if it is inside the text passed to processText it is relative to the given includeDir.
 
* define, undefine
  ```javascript
  // #define FLAG
  ```
  This command adds FLAG to defines, removes the line it is in and continues to parse. ``#undefine`` removes the given name from defines.
 
* ifdef, ifndef
  ```javascript
  // #ifndef FLAG
  some code
  // #endif
  ```
  When the Preprocessor reaches this line it checks if the condition is fullfilled (if the following name is defined (``#ifdef``) or not defined (``#ifndef``)). If it is fullfilled, it removes the line it is in and continues to parse and when it reaches the corresponding ``#endif`` this line is removed, too. Else it removes all lines from the result till the fitting ``#endif`` and continues to parse with the following line.

* warning, error
  ```javascript
  // #warning "The programm is still missing some functionality, don't deliver!"
  ```
  A warning is printed to the console via ``console.warn()`` prepended with ``"Preprocessor warning: "``. ``#error`` raises an error whichs message is prepended with ``"Preprocessor error: "``, this means the preprocessing is canceled if the preprocessor reaches this point.


Installation
------------

Copy the repository folder to your node_modules folder.


Usage
-----

Normal usage example:

  ```javascript
  var uprocess = require("uprocess");
  var processed = uprocess.processFile("some/file.js", { SMALL: true });
  ```

Tipps & Tricks
--------------

* Include a file only once, even if it is stated in several include statements

  This works like in C. Surround every file you want to include once with statements like this (inside the file):
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

Interface
---------

The module provides the following functions and variables:

* ``uprocess.processFile(filePath, extDefines)``

  ``filePath`` is a path to a file whichs content is to be processed. ``extDefines`` is an object containing external defines which affect the processing as if they were setted via the ``#define`` command. Includepaths are relative to the file they are in.

* ``uprocess.processText(text, extDefines, includeDir)``

  ``text`` is a string to be processed. ``extDefines`` is an object containing external defines which affect the processing as if they were setted via the ``#define`` command. ``includeDir`` is the directory all includes inside the text are made relative to. Includepaths inside of included files are relative to the file they are in.

* ``uprocess.DEBUG``

  If this flag is setted to true. uprocess prints debug information to stdout (begin and end of files, defines).

* ``uprocess.endLineDelimiter``

  Changing this string will change the end of all lines in the result - no matter how the lines were ended before.

Documentation
-------------

You might want to check the code.
