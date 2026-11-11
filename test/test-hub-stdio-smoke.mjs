import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('patched engine discovers its full catalog and performs original file tools over stdio', { timeout: 30000 }, async () => {
    const sandbox = await mkdtemp(join(tmpdir(), 'rdc-hub-smoke-'));
    const configDirectory = join(sandbox, 'config');
    await mkdir(configDirectory);
    await writeFile(join(configDirectory, 'config.json'), JSON.stringify({
        allowedDirectories: [sandbox], telemetryEnabled: false,
    }));
    const runtimeEnvironment = {};
    for (const key of ['PATH', 'SystemRoot', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'WINDIR']) {
        if (process.env[key]) runtimeEnvironment[key] = process.env[key];
    }
    Object.assign(runtimeEnvironment, {
        HOME: sandbox, USERPROFILE: sandbox, RDC_CONFIG_DIR: configDirectory,
        DC_REMOTE_DEVICE: 'true', DESKTOP_COMMANDER_DISABLE_TELEMETRY: '1', UV_THREADPOOL_SIZE: '16',
    });
    const client = new Client({ name: 'hub-runtime-smoke', version: '1' });
    try {
        await client.connect(new StdioClientTransport({
            command: process.execPath,
            args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
            env: runtimeEnvironment, stderr: 'ignore',
        }));
        const catalog = await client.listTools();
        assert.equal(catalog.tools.length, 25);
        const pdfTool = catalog.tools.find(tool => tool.name === 'write_pdf');
        assert.deepEqual(pdfTool.inputSchema.properties.content.anyOf.map(branch => branch.type), ['string', 'array']);
        const fixturePath = join(sandbox, 'fixture.txt');
        const written = await client.callTool({
            name: 'write_file', arguments: { path: fixturePath, content: 'PATCHED_ENGINE_MARKER' },
        });
        assert.notEqual(written.isError, true);
        const read = await client.callTool({ name: 'read_file', arguments: { path: fixturePath } });
        assert.notEqual(read.isError, true);
        assert.ok(read.content.some(part => part.text?.includes('PATCHED_ENGINE_MARKER')));
        const missing = await client.callTool({ name: 'read_file', arguments: { path: join(sandbox, 'missing') } });
        assert.equal(missing.isError, true);
    } finally {
        await client.close();
        await rm(sandbox, { recursive: true, force: true });
    }
});
