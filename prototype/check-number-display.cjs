const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const document={body:{},querySelectorAll:()=>[],addEventListener:()=>{}};
const code=fs.readFileSync(__dirname+'/number-display.js','utf8');
vm.runInNewContext(code+`
assert.equal(groupNumber('19007871.44'),'19,007,871.44');
assert.equal(groupNumber('-60978.15'),'-60,978.15');
assert.equal(groupNumber('0'),'0.00');
assert.equal(groupNumber('1234.56789'),'1,234.56789');
assert.equal(groupNumber(''),'');
assert.equal(ungroupNumber('1,234,567.89'),'1234567.89');
assert.equal(ungroupNumber('1，234.56'),'1234.56');
assert.equal(groupNumber(groupNumber('123456.78')),'123,456.78');
console.log('Numeric grouping, precision and parsing checks passed');
`,{assert,console,document,MutationObserver:class{observe(){}}});
