uprocess
========

A simple preprocessor written in javascript, supports include, define, ifdef and ifndef.

It takes a file and an object with defines (values are ignored) and returns the processed file. 

It can be used to make a build script which creates indivdualised builds of one software, it can also be used to just include files and control that they are only included once.

Motivation
----------

A preprocessor everybody is able to understand. It should be VERY clear what it does and what it doesn't.


Commands
--------

* include
  ```javascript
  // #include "some/file.js"
  ```
  This command takes the text from the specified file (path relative to the parsed file), processes it and the puts it at its own position and continues with next line after the included file.
 
* define, undefine
  ```javascript
  // #define FLAG
  ```
  This command adds FLAG to defines, removes the line it is in and continues to parse. #undefine would remove the given name from defines.
 
* ifdef, ifndef
  ```javascript
  // #ifdef FLAG
  some code
  // #endif
  ```
  When the Preprocessor reaches this line it checks if the condition is fullfilled (if the following name is defined (#ifdef) or not defined (#ifndef)). If it is it removes the line it is in and continues to parse and when it reaches the corresponding #endif this line is removed, too. Else it removes all lines from the result till the fitting #endif and continues to parse with the following line.

* warning, error
  ```javascript
  // #warning "The programm is still missing some functionality, don't deliver!"
  ```
  A warning is printed to the console via console.warn() prepended with "Preprocessor warning: ". #error raises an error, that means the preprocessing is canceled if the preprocessor reaches this point.


Installation
------------

Copy the repository folder to your node_modules folder.



Usage
-----
  ```javascript
  var uprocess = require("uprocess");
  var processed = uprocess.processFile("some/file.js", { SMALL: true });
  ```


Tipps & Tricks
--------------

* Include a file only once
  This works exactly like in C. Surround every file you want to include only once with statements like this (inside the file):
  ```javascript
  // #ifndef __FILENAME__
  // #define __FILENAME__
  
  //Here comes the regular text of the file.
  function somefunc(param) {
    return param + param;
  }
  
  // #endif
  ```
  What you use as the define is not important as long as it is only used once inside your project. So filename should be ok normally.
