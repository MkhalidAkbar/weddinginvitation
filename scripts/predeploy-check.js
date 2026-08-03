#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');let failed=0,passed=0;
function ok(name,value,detail){if(value){passed++;console.log('✓',name)}else{failed++;console.error('✗',name,detail||'')}}
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules','.netlify'].includes(e.name))continue;const p=path.join(dir,e.name);e.isDirectory()?walk(p,out):out.push(p)}return out}
const required=['panel.html','payment.html','terms.html','privacy.html','netlify.toml','netlify/functions/create-payment.js','netlify/functions/payment-status.js','netlify/functions/payment-webhook.js','supabase/schema_phase1_security_hardening.sql','supabase/schema_phase2_payment_backend.sql','PAYMENT_PHASE2_3.md','NETLIFY_DEPLOYMENT_GUIDE.md','PHASE4_TESTING.md'];
required.forEach(f=>ok('Required file: '+f,fs.existsSync(path.join(root,f))));
const files=walk(root);const js=files.filter(f=>f.endsWith('.js'));
for(const f of js){try{cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe'});passed++}catch(e){failed++;console.error('✗ JavaScript syntax:',path.relative(root,f),String(e.stderr||e.message))}}
console.log('✓ JavaScript syntax:',js.length,'files checked');
const textFiles=files.filter(f=>/\.(js|html|css|toml|md|json|yml|yaml|sql)$/i.test(f));
const forbidden=[/SB-Mid-server-[A-Za-z0-9_-]{8,}/g,/\bMid-server-[A-Za-z0-9_-]{8,}/g,/XENDIT_SECRET_KEY\s*[=:]\s*['\"][^'\"\s]{8,}/g,/SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*['\"][^'\"\s]{8,}/g];let leaks=[];
for(const f of textFiles){const rel=path.relative(root,f);if(rel==='.env.example'||rel==='scripts/predeploy-check.js')continue;const s=fs.readFileSync(f,'utf8');for(const re of forbidden){re.lastIndex=0;if(re.test(s))leaks.push(rel+' ('+re.source.slice(0,26)+'…)')}}
ok('No server keys committed',leaks.length===0,leaks.join(', '));
const cfg=fs.readFileSync(path.join(root,'db-config.js'),'utf8');ok('Frontend config contains no server key',!/MIDTRANS_SERVER_KEY|SUPABASE_SERVICE_ROLE_KEY|XENDIT_SECRET_KEY/.test(cfg));
const netlify=fs.readFileSync(path.join(root,'netlify.toml'),'utf8');['/api/pay','/api/webhook','/api/payment-status'].forEach(r=>ok('Netlify route: '+r,netlify.includes('from = "'+r+'"')));
const html=files.filter(f=>f.endsWith('.html'));let missing=[];for(const f of html){const s=fs.readFileSync(f,'utf8').replace(/<!--[\s\S]*?-->/g,''),re=/(?:src|href)=["']([^"']+)["']/g;let m;while((m=re.exec(s))){let u=m[1].split(/[?#]/)[0];if(!u||/^(https?:|mailto:|tel:|data:|blob:|#|\/)/.test(u))continue;const target=path.resolve(path.dirname(f),u);if(!fs.existsSync(target))missing.push(path.relative(root,f)+' → '+u)}}
ok('All local HTML assets exist',missing.length===0,missing.join(', '));
const envNames=['MIDTRANS_SERVER_KEY','SUPABASE_SERVICE_ROLE_KEY'];const prod=process.argv.includes('--production');if(prod){envNames.forEach(k=>ok('Production env present: '+k,!!process.env[k]));ok('Production provider selected',['midtrans','xendit'].includes(String(process.env.PAYMENT_PROVIDER||'').toLowerCase()));ok('PUBLIC_BASE_URL uses HTTPS',/^https:\/\//.test(process.env.PUBLIC_BASE_URL||''))}
console.log(`\nPre-deploy checks: ${passed} passed, ${failed} failed.`);if(failed)process.exit(1);
