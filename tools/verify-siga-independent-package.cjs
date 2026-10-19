const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=process.argv[2]||'C:/SIGA-Offline',load=createRequire(path.join(root,'package.json')),asar=load('@electron/asar'),archive=path.join(root,'dist/win-unpacked/resources/app.asar');
const files=asar.listPackage(archive),json=name=>JSON.parse(asar.extractFile(archive,name).toString('utf8'));
assert.deepEqual(Object.keys(json('electron/license-config.json')),['publicKey']);
assert.deepEqual(json('electron/google-drive-config.json'),{clientId:'',clientSecret:''});
for(const name of files)assert.doesNotMatch(name,/license-secrets|signing-key\.pem|google-oauth-desktop\.json|licensing[\\/]firebase|web[\\/]src[\\/]admin[\\/]licencas-lite\.js|electron[\\/]presence\.cjs/i);
for(const name of ['electron','web']){
 const scan=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory()){if(entry.name!=='vendor')scan(file);}else if(/\.(cjs|js|json|html)$/.test(entry.name))assert.doesNotMatch(fs.readFileSync(file,'utf8'),/https?:\/\/[^\s'"<>]*(?:gesproc2|sigaepp|cloudfunctions\.net|firebaseapp\.com)/i,file);}};
 scan(path.join(root,name));
}
console.log('OK: pacote sem endpoint pessoal, sem credenciais OAuth compartilhadas, sem chave privada e sem cliente de presença central.');
