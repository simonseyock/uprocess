var uprocess = require( "../../uprocess.js" );

var text =
"// #ifdef flag1\n"
+ "// #include \"dataFile1.js\"\n"
+ "// #endif\n"
+ "// #ifndef flag1\n"
+ "// #include \"dataFile2.js\"\n"
+ "// #endif\n"

console.log( "This test should result in the text \"dataFile1\". Is that the case?" );

console.log(uprocess.processText( text, { flag1: true }, __dirname ));

console.log( "This test should result in the text \"dataFile2\". Is that the case?" );

console.log(uprocess.processText( text, {}, __dirname ));