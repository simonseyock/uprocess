var fs = require( "fs" );
var path = require( "path" );

/*
 * The expressions object contains the regular expressions that each line is checked against. If a expression
 * needs a value it is specified inside the first pair of round brackets ().
 */
expressions = {
    DEFINE: /^\s*\/\/\s+#define\s+(\S+)/,
    INCLUDE: /^\s*\/\/\s+#include\s+"([^"]+)"/,
    IFDEF: /^\s*\/\/\s+#ifdef\s+(\S+)/,
    IFNDEF: /^\s*\/\/\s+#ifndef\s+(\S+)/,
    ENDIF: /^\s*\/\/\s+#endif/,
    UNDEFINE: /^\s*\/\/\s+#undefine\s+(\S+)/,
    WARNING: /^\s*\/\/\s+#warning\s+"([^"]+)"/,
    ERROR: /^\s*\/\/\s+#error\s+"([^"]+)"/
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
 * variable containing the linenumber is adjusted accordingly.
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

    for ( var linenumber = 0; linenumber < lines.length; linenumber += 1 ) {

        if ( !excluded ) {

            //DEFINE
            if ( lines[linenumber].match( expressions.DEFINE ) ) {
                expvalue = lines[linenumber].match( expressions.DEFINE )[1];
                defines[expvalue] = true;
                lines = removeSingleLine( lines, linenumber );

                linenumber -= 1;
                continue;
            }

            //UNDEFINE
            if ( lines[linenumber].match( expressions.UNDEFINE ) ) {
                expvalue = lines[linenumber].match( expressions.UNDEFINE )[1];
                if ( expvalue in defines ) {
                    delete defines[expvalue];
                }
                lines = removeSingleLine( lines, linenumber );

                linenumber -= 1;
                continue;
            }

            //INCLUDE
            if ( lines[linenumber].match( expressions.INCLUDE ) ) {
                expvalue = lines[linenumber].match( expressions.INCLUDE )[1];

                var includeFile = path.join( includeDir, expvalue );

                var newLines = splitIntoLines( fs.readFileSync( includeFile, "utf-8" ) );

                debugMsg( "start of File: " + includeFile );
                newLines = processLines( newLines, defines, path.dirname( includeFile ), path.basename( includeFile ) ); // recurse
                debugMsg( "end of File: " + includeFile );


                lines = removeSingleLine( lines, linenumber );
                lines = insertLines( lines, linenumber, newLines );

                linenumber += newLines.length - 1;
                continue;
            }

            //WARNING
            if ( lines[linenumber].match( expressions.WARNING ) ) {
                expvalue = lines[linenumber].match( expressions.WARNING )[1];

                if ( fileName ) {
                    console.warn( '#warning in "' + path.join( includeDir, fileName ) + '":' + expvalue );
                } else {
                    console.warn( "#warning: " + expvalue );
                }

                lines = removeSingleLine( lines, linenumber );
                linenumber -= 1;
                continue;
            }

            //ERROR
            if ( lines[linenumber].match( expressions.ERROR ) ) {
                expvalue = lines[linenumber].match( expressions.ERROR )[1];

                if ( fileName ) {
                    throw new Error( '#error in "' + path.join( includeDir, fileName ) + '":' + expvalue );
                } else {
                    throw new Error( "#error: " + expvalue );
                }
            }

        }

        //IFDEF
        if ( lines[linenumber].match( expressions.IFDEF ) ) {

            openexpressions.push( linenumber );
            expvalue = lines[linenumber].match( expressions.IFDEF )[1];
            if ( !( expvalue in defines ) || excluded ) {
                excluded += 1;
            }

            lines = removeSingleLine( lines, linenumber );
            linenumber -= 1;
            continue;
        }

        //IFNDEF
        if ( lines[linenumber].match( expressions.IFNDEF ) ) {

            openexpressions.push( linenumber );
            expvalue = lines[linenumber].match( expressions.IFNDEF )[1];
            if ( ( expvalue in defines ) || excluded ) {
                excluded += 1;
            }

            lines = removeSingleLine( lines, linenumber );
            linenumber -= 1;
            continue;
        }

        //ENDIF
        if ( lines[linenumber].match( expressions.ENDIF ) ) {

            var startline = openexpressions.pop();
            if ( startline !== undefined ) {
                if ( excluded ) {
                    lines = removeLines( lines, startline, linenumber + 1 );
                    linenumber = startline - 1;
                    excluded -= 1;
                } else {
                    lines = removeSingleLine( lines, linenumber );
                    linenumber -= 1;
                }
                continue;
            } else {
                throw new Error( "Too many ENDIF expressions in text!" );
            }
        }

    }

    if ( openexpressions.length !== 0 ) {
        throw new Error( openexpressions.length + " missing ENDIF expressions!" );
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