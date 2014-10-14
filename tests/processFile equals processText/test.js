var uprocess = require( "../../uprocess.js" );

var fs = require( "fs" );
var path = require( "path" );

var text =
"// #ifdef flag1\n"
+ "// #include \"dataFile1.js\"\n"
+ "// #endif\n"
+ "text"

var file = path.join( __dirname, "scriptFile.js" );

if ( text !== fs.readFileSync( file, "utf-8" ) ) {
    throw new Error( "file " + file + " and the text inside of this script arent't identical" );
}

var defines = { flag1: true };

if ( uprocess.processText( text, defines, __dirname ) === uprocess.processFile( file, defines ) ) {
    console.log( "The results of processText and processFile are identical, test passed" );
} else {
    throw new Error( "The results of processText and processFile aren't identical, while having the same input!" );
}