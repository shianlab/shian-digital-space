import fs from 'node:fs';
import dns from 'node:dns';
import https from 'node:https';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const out = 'docs/planning/materials/cloudbase-deployment-2026-10-07';
const binding = JSON.parse(fs.readFileSync(`${out}/www-routes-final.json`, 'utf8').replace(/^\uFEFF/, ''));
const domain = binding.data.raw.Domains.find(item => item.Domain === 'www.shian.life');
assert.equal(domain.Status, 'SUCCESS');
assert.ok(domain.Cname.endsWith('.tcbaccess.tencentcloudbase.com'));
const address = await dns.promises.lookup(domain.Cname, {family:4});
const usePublicDns = process.argv.includes('--public-dns');
const report = {domain:domain.Domain, platformCname:domain.Cname,
    probe:usePublicDns ? 'Use ordinary public DNS and TLS certificate validation.'
        : 'Connect to the verified platform address while preserving the real Host, SNI and TLS certificate validation. This does not prove public DNS is configured.',
    publicDns:await dns.promises.lookup(domain.Domain).then(result => ({resolved:true, address:result.address}), error => ({resolved:false, code:error.code})), checks:[]};

function request(pathname) {
    return new Promise((resolve, reject) => {
        const req = https.get({hostname:domain.Domain, path:pathname, servername:domain.Domain,
            ...(usePublicDns ? {} : {lookup:(_host, options, callback) => options.all
                ? callback(null, [address]) : callback(null, address.address, address.family)})}, response => {
            const authorized = response.socket.authorized;
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve({status:response.statusCode, headers:response.headers,
                authorized, body:Buffer.concat(chunks)}));
            response.on('error', reject);
        });
        req.setTimeout(40000, () => req.destroy(new Error('HTTPS route probe timed out')));
        req.on('error', reject);
    });
}
const entry = fs.readFileSync('dist/index.html', 'utf8').match(/src="(\/assets\/index-[^"]+\.js)"/)[1];
for (const pathname of ['/', '/gallery', '/studio', '/about', '/contact', '/start/', entry, '/sounds/papersound.mp3', '/styles/site-footer.css']) {
    const result = await request(pathname);
    assert.equal(result.status, 200, pathname);
    assert.equal(result.authorized, true, 'TLS certificate validation: ' + pathname);
    const local = pathname === '/' ? 'dist/index.html'
        : ['gallery','studio','about','contact'].includes(pathname.slice(1)) ? `dist${pathname}/index.html`
        : pathname === '/start/' ? 'dist/start/index.html' : 'dist' + pathname;
    const hash = data => createHash('sha256').update(data).digest('hex');
    assert.equal(hash(result.body), hash(fs.readFileSync(local)), 'served content matches release: ' + pathname);
    report.checks.push({pathname, status:result.status, tlsValid:result.authorized, sha256Matches:true,
        contentType:result.headers['content-type'], cacheControl:result.headers['cache-control'],
        contentDisposition:result.headers['content-disposition'], contentEncoding:result.headers['content-encoding']});
}
fs.writeFileSync(`${out}/${usePublicDns ? 'www-public-https' : 'www-https-route-probe'}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
