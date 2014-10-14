var uprocess = require( "../../uprocess.js" );

var fs = require( "fs" );
var path = require( "path" );

var text =
"// #include \"testFolder/scriptFile.js\"";


if ( uprocess.processText( text, {}, __dirname ) === "dataFile1" ) {
    console.log( "The included file did include another file with a path relaytive to it, test passed." );
} else {
    throw new Error( "The results aren't as expected." );
}