import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { preparePdfBrowser } from '../dist/utils/pdf-browser-launch.js';

test('default browser launch stays unchanged', async () => {
    delete process.env.RDC_PDF_BROWSER_UID;
    const result = await preparePdfBrowser('/unchanged/browser', '--user-data-dir=/unused');
    assert.equal(result.executable, '/unchanged/browser');
    await result.release();
});
test('Linux root launcher drops browser identity without disabling sandbox', {skip:process.platform!=='linux'||process.getuid?.()!==0}, async () => {
    const profile = await mkdtemp(join(tmpdir(),'rdc-browser-test-'));
    process.env.RDC_PDF_BROWSER_UID='65534';process.env.RDC_PDF_BROWSER_GID='65534';
    try {
        const result=await preparePdfBrowser('/usr/bin/id','--user-data-dir='+profile);
        try {
            assert.equal(execFileSync(result.executable,['-u'],{encoding:'utf8'}).trim(),'65534');
            assert.equal((await stat(profile)).uid,65534);
            assert.equal((await stat(result.executable)).uid,0);
        } finally { await result.release(); }
        process.env.RDC_PDF_BROWSER_UID='0';
        await assert.rejects(preparePdfBrowser('/usr/bin/id','--user-data-dir='+profile),/positive/);
    } finally {delete process.env.RDC_PDF_BROWSER_UID;delete process.env.RDC_PDF_BROWSER_GID;await rm(profile,{recursive:true,force:true});}
});
