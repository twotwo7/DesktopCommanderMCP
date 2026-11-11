import fs from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Opt-in Linux root rendering: Chrome drops UID/GID and keeps its sandbox. */
export async function preparePdfBrowser(executable: string | undefined, profileArg: string) {
    if (process.platform !== 'linux' || process.getuid?.() !== 0 || !process.env.RDC_PDF_BROWSER_UID) {
        return { executable, release: async () => {} };
    }
    const uid = Number(process.env.RDC_PDF_BROWSER_UID), gid = Number(process.env.RDC_PDF_BROWSER_GID);
    if (!Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(gid) || gid <= 0 || !executable) {
        throw new Error('Root PDF rendering requires a positive dedicated browser UID/GID and an installed browser');
    }
    const profile = profileArg.slice('--user-data-dir='.length);
    if (!profileArg.startsWith('--user-data-dir=') || !profile) throw new Error('Explicit PDF profile required');
    await fs.chown(profile, uid, gid);
    // Root-only directory: the browser account cannot replace this launcher.
    const directory = await fs.mkdtemp(join(tmpdir(), 'rdc-pdf-launch-'));
    const launcher = join(directory, 'browser.mjs');
    const source = `#!${process.execPath}\nimport {spawn} from 'node:child_process';\nconst child=spawn(${JSON.stringify(executable)},process.argv.slice(2),{uid:${uid},gid:${gid},stdio:'inherit',env:{...process.env,HOME:${JSON.stringify(profile)}}});\nfor(const s of ['SIGTERM','SIGINT','SIGHUP'])process.on(s,()=>child.kill(s));\nchild.on('error',()=>process.exit(1));child.on('exit',(code)=>process.exit(code??1));\n`;
    await fs.writeFile(launcher, source, {mode:0o700,flag:'wx'});
    return { executable: launcher, release: async () => { await fs.rm(directory,{recursive:true,force:true}); } };
}
