var fs = require( "fs" );
var path = require( "path" );

/*
 * The expressions object contains the regular expressions that each line is checked against. If a expression
 * needs a value it is specified inside the first pair of round brackets ().
 */
expressions = {
    DEFINE: /^\s*\/\/\s*#define\s+(\S+)/,
    INCLUDE: /^\s*\/\/\s*#include\s+"([^"]+)"/,
    IFDEF: /^\s*\/\/\s*#ifdef\s+(\S+)/,
    IFNDEF: /^\s*\/\/\s*#ifndef\s+(\S+)/,
    ENDIF: /^\s*\/\/\s*#endif/,
    UNDEFINE: /^\s*\/\/\s*#undefine\s+(\S+)/,
    WARNING: /^\s*\/\/\s*#warning\s+"([^"]+)"/,
    ERROR: /^\s*\/\/\s*#error\s+"([^"]+)"/,
    UNKNOWNCOMMAND: /^\s*\/\/\s*#([^\s]*)/
};

/*
 * The DEBUG flag can be setted to true from the outside to make uprocess print debug messages to stdout via console.log
 */
exports.DEBUG = false;

/*
 * the outputLineDelimiter is the string which is used to join all the lines in the end.
 */
exports.outputLineDelimiter = "\n";

/*
 * processFile takes a filename and an defines object and returns the processed text of the file. The file is parsed
 * linewise splitting at \n and \r and at any combination of it. The defines object is copied and all the defines inside
 * will be used as setted via define inside of the preprocessor. Includes in this file are made relative to the file.
 */
exports.processFile = function ( file, extDefines ) {

    var defines = ( typeof extDefines === "object" ) ? copyObject( extDefines ) : {};

    var lines = splitIntoLines( fs.readFileSync( file, "utf-8" ) );

    debugMsg( "Start of File: " + file );
    var newLines = processLines( lines, defines, path.dirname( file ), path.basename( file ) );
    debugMsg( "End of File: " + file );

    return newLines.join( exports.outputLineDelimiter );
};

/*
 * processText takes a string, an defines object, an includeDir and returns the processed text. It works the same
 * way processFile works, but all includes inside the given text are made relative to the given includeDir. Inside
 * included files the includes are made relative to the file relative to includeDir.
 */
exports.processText = function ( text, extDefines, includeDir ) {

    var defines = ( typeof extDefines === "object" ) ? copyObject( extDefines ) : {};

    var lines = splitIntoLines( text );

    var newLines = processLines( lines, defines, includeDir, "" );

    return newLines.join( exports.outputLineDelimiter );
};

/*
 * processLines is the internal function which takes an array of lines, an object with defines and an includeDir to 
 * include files relative to.
 * It checks each line for a preprocessor expression and if it finds one it is evaluated and removed afterwards. The 
 * variable containing the lineNumber is adjusted accordingly.
 * If the variable excluded is bigger than 0 this means the lines which do not contain another ifdef/ifndef or an endif
 * are ignored and excluded. If excluded is bigger than 0 AND it reaches an ifdef/ifndef excluded is raised by 1 and 
 * if it reaches an endif it is lowered by 1 till it reaches 0.
 * define/undefine:
 * adds/removes a variablename to the defines object, which is used by reference, that means the define will be
 * setted outside of the call, too.
 * include:
 * loads a file and calls processLines recursively on it. the resulting lines are inserted.
 * warning/error:
 * raises a warning/error with the given message if it is reached
 * ifdef/ifndef:
 * ifdef will check if the given define is setted and ifndef will check if it isn't. If it isn't true the following 
 * lines till the corresponding endif are excluded from the result, any other preprocessor expressions are ignored.
 * The corresponding endif is the endif which has the same amount of ifdef/ifndef and endif expressions in between
 * the ifdef/ifndef and endif expression.
 */
function processLines( lines, defines, includeDir, fileName ) {

    debugMsg( "Defines:" );
    debugMsg( defines );

    var openexpressions = [];

    var excluded = 0; //how many levels of ifdef/ifndef are to be excluded

    var expvalue;

    var originalLineNumber = 0;

    try {

        for ( var lineNumber = 0; lineNumber < lines.length; lineNumber += 1 ) {

            originalLineNumber += 1;
            
            //DEFINE
            if ( lines[lineNumber].match( expressions.DEFINE ) ) {
                if ( !excluded ) {
                    expvalue = lines[lineNumber].match( expressions.DEFINE )[1];
                    defines[expvalue] = true;
                    lines = removeSingleLine( lines, lineNumber );

                    lineNumber -= 1;
                    continue;
                }
            }

            //UNDEFINE
            else if ( lines[lineNumber].match( expressions.UNDEFINE ) ) {
                if ( !excluded ) {
                    expvalue = lines[lineNumber].match( expressions.UNDEFINE )[1];
                    if ( expvalue in defines ) {
                        delete defines[expvalue];
                    }
                    lines = removeSingleLine( lines, lineNumber );

                    lineNumber -= 1;
                    continue;
                }
            }

            //INCLUDE
            else if ( lines[lineNumber].match( expressions.INCLUDE ) ) {
                if ( !excluded ) {
                    expvalue = lines[lineNumber].match( expressions.INCLUDE )[1];

                    var includeFile = path.join( includeDir, expvalue );

                    var newLines = splitIntoLines( fs.readFileSync( includeFile, "utf-8" ) );

                    debugMsg( "start of File: " + includeFile );
                    newLines = processLines( newLines, defines, path.dirname( includeFile ), path.basename( includeFile ) ); // recurse
                    debugMsg( "end of File: " + includeFile );


                    lines = removeSingleLine( lines, lineNumber );
                    lines = insertLines( lines, lineNumber, newLines );

                    lineNumber += newLines.length - 1;
                    continue;
                }
            }
            
            //WARNING
            else if ( lines[lineNumber].match( expressions.WARNING ) ) {
                if ( !excluded ) {
                    expvalue = lines[lineNumber].match( expressions.WARNING )[1];

                    console.warn( '#warning: ' + expvalue + errorLocation( originalLineNumber, includeDir, fileName ) );

                    lines = removeSingleLine( lines, lineNumber );
                    lineNumber -= 1;
                    continue;
                }
            }

            //ERROR
            else if ( lines[lineNumber].match( expressions.ERROR ) ) {
                if ( !excluded ) {
                    expvalue = lines[lineNumber].match( expressions.ERROR )[1];

                    throw new Error( '#error: ' + expvalue ); //errorLocation gets append in the catch block
                }
            }

            //IFDEF
            else if ( lines[lineNumber].match( expressions.IFDEF ) ) {

                openexpressions.push( lineNumber );
                expvalue = lines[lineNumber].match( expressions.IFDEF )[1];
                if ( !( expvalue in defines ) || excluded ) {
                    excluded += 1;
                }

                lines = removeSingleLine( lines, lineNumber );
                lineNumber -= 1;
                continue;
            }

            //IFNDEF
            else if ( lines[lineNumber].match( expressions.IFNDEF ) ) {

                openexpressions.push( lineNumber );
                expvalue = lines[lineNumber].match( expressions.IFNDEF )[1];
                if ( ( expvalue in defines ) || excluded ) {
                    excluded += 1;
                }

                lines = removeSingleLine( lines, lineNumber );
                lineNumber -= 1;
                continue;
            }

            //ENDIF
            else if ( lines[lineNumber].match( expressions.ENDIF ) ) {

                var startline = openexpressions.pop();
                if ( startline !== undefined ) {
                    if ( excluded ) {
                        lines = removeLines( lines, startline, lineNumber + 1 );
                        lineNumber = startline - 1;
                        excluded -= 1;
                    } else {
                        lines = removeSingleLine( lines, lineNumber );
                        lineNumber -= 1;
                    }
                    continue;
                } else {
                    throw new Error( "Too many ENDIF expressions in text!" );
                }
            }
            
            // UNKNOWNCOMMAND
            else if ( lines[lineNumber].match( expressions.UNKNOWNCOMMAND ) ) {
                expvalue = lines[lineNumber].match( expressions.UNKNOWNCOMMAND )[1];
                console.warn( 'Unknown command #' + expvalue + " found " + errorLocation( originalLineNumber, includeDir, fileName ) );
            }

        }

        originalLineNumber = 0;

        if ( openexpressions.length !== 0 ) {
            throw new Error( openexpressions.length + " missing ENDIF expressions!" );
        }

    } catch ( e ) {
        e.message += errorLocation( originalLineNumber, includeDir, fileName ) + "\n";
        throw e;
    }

    return lines;
};


/*
 * copyObj returns a one level deep copy of an object
 */
function copyObject( obj ) {
    var newObj = {};
    for ( k in obj ) {
        newObj[k] = obj[k];
    }
    return newObj;
}

/*
 * debugMsg prints a debug message if the DEBUG flag is setted to true
 */
function debugMsg( debugmsg ) {
    if ( exports.DEBUG ) {
        console.log( debugmsg );
    }
}


/*
 * removeSingleLine removes the line at index and returns the array.
 */
function removeSingleLine( lines, index ) {
    lines.splice( index, 1 );
    return lines;
}

/*
 * removeLines removes the lines from index start up to but not including index end and returns the array.
 */
function removeLines( lines, start, end ) {
    lines.splice( start, end - start );
    return lines;
}

/*
 * insertLines returns an array with at pos inserted newLines.
 */
function insertLines( lines, index, newLines ) {
    return lines.slice( 0, index ).concat( newLines ).concat( lines.slice( index ) );
}

/*
 * splitIntoLines splits a text into lines
 */
function splitIntoLines( text ) {
    return text.split( /[\r\n]{1,2}/gm );
}

/*
 * errorLocation with opt_linenumber and opt_filename
 */
function errorLocation( opt_linenumber, includeDir, opt_filename ) {

    var msg = "";
    if ( opt_linenumber || opt_filename ) {
        msg = '\noccured while processing';

        if ( opt_filename ) {
             msg += ' "' + path.join( includeDir, opt_filename ) + '"';
        }

        if ( opt_linenumber ) {
            msg += ' line ' + opt_linenumber;
        }
    }

    return msg;
}