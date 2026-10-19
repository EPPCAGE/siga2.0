const path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=process.argv[2]||'C:/SIGA-Offline',load=createRequire(path.join(root,'package.json')),asar=load('@electron/asar'),archive=path.join(root,'dist/win-unpacked/resources/app.asar');
const files=asar.listPackage(archive).map(name=>name.split(path.sep).join('/')),config=JSON.parse(asar.extractFile(archive,'electron/license-config.json').toString('utf8'));
assert.equal(config.endpoint,'https://us-central1-gesproc2.cloudfunctions.net/sigaLiteLicense');assert.ok(config.publicKey.includes('PUBLIC KEY'));
assert.ok(files.some(name=>name.endsWith('/electron/local-transfer.cjs')));
for(const name of files)assert.doesNotMatch(name,/license-secrets|signing-key\.pem|google-oauth-desktop\.json|google-drive(?:-config)?\.(?:cjs|json)|google-progress\.cjs|institutional-drive\.cjs|retired-google-projects\.json|offline-license\.cjs|license-codes\.json|web[\\/]offline[\\/]progress\.js|electron[\\/]presence\.cjs/i);
console.log('OK: licenciamento Firebase configurado, transferências locais presentes, pacote sem Drive, OAuth, chave privada ou ativação por arquivo.');
