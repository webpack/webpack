function sink(){console.log("sink")}
try{(function(){ (input=>sink(input))(later); const later=1; })()}catch(e){console.log(e.name)}
try{(function(){ (function(input){return sink(input)})(later); let later=1; })()}catch(e){console.log(e.name)}
