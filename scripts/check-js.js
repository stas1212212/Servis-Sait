"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"../server");
function collect(dir){
  let list=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,e.name);
    if(e.isDirectory())list=list.concat(collect(file));
    else if(e.name.endsWith(".js"))list.push(file);
  }
  return list;
}
let failed=0;
for(const file of collect(root)){
  const r=spawnSync(process.execPath,["--check",file],{stdio:"inherit"});
  if(r.status!==0){failed++;console.error("Syntax error:",path.relative(root,file));}
}
console.log("Checked JavaScript files:",collect(root).length,", errors:",failed);
if(failed)process.exitCode=1;
