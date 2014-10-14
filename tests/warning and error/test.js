var uprocess = require( "../../uprocess.js" );

var text =
"// #warning \"I did warn you!\"\n"
+ "// #error \"Didn't I warn you?\"\n"
+ "// #warning \"I did warn you!\"\n";

console.log( "This test should result in one console warning and one error. Is that the case?" );

uprocess.processText( text );
