import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { toolJsonSchema } from '../dist/utils/tool-json-schema.js';
import { ReadFileArgsSchema, WritePdfArgsSchema, TrackUiEventArgsSchema, KillProcessArgsSchema } from '../dist/tools/schemas.js';
import { detectUnsupportedParams, getSupportedParams } from '../dist/utils/unsupportedParams.js';

test('patched constrained collections reject oversized invalid input without accumulating per-item errors', () => {
    const result = z.array(z.number()).max(2).safeParse(Array(20000).fill('invalid'));
    assert.equal(result.success, false);
    assert.ok(result.error.issues.length <= 2, 'collection bound must short-circuit before item error amplification');
});
test('tool input schemas preserve defaults, free-form options and unknown-key diagnostics', () => {
    const parsed = ReadFileArgsSchema.parse({ path: '/fixture', options: { arbitrary: true }, invented: 1 });
    assert.equal(parsed.offset, 0);
    assert.deepEqual(parsed.options, { arbitrary: true });
    assert.equal('invented' in parsed, false);
    assert.deepEqual(detectUnsupportedParams({ path: '/fixture', invented: 1 }, ReadFileArgsSchema), ['invented']);
    assert.ok(getSupportedParams(ReadFileArgsSchema).includes('options'));
    assert.deepEqual(TrackUiEventArgsSchema.parse({ event: 'fixture', params: { a: 1, b: null } }).params, { a: 1, b: null });
    const input = toolJsonSchema(ReadFileArgsSchema);
    assert.equal(input.type, 'object');
    assert.equal(input.additionalProperties, false);
    assert.deepEqual(input.required, ['path']);
    assert.equal(input.properties.options.type, 'object');
});
test('PDF operation JSON strings still parse as operations and expose their real input schema', () => {
    const operations = [{ type: 'delete', pageIndexes: [0] }];
    assert.deepEqual(WritePdfArgsSchema.parse({ path: '/fixture.pdf', content: JSON.stringify(operations) }).content, operations);
    assert.equal(WritePdfArgsSchema.safeParse({ path: '/fixture.pdf', content: '[1]' }).success, false);
    const input = toolJsonSchema(WritePdfArgsSchema);
    assert.deepEqual(input.properties.content.anyOf.map(branch => branch.type), ['string', 'array']);
    assert.equal(KillProcessArgsSchema.safeParse({ pid: 0 }).success, false);
    assert.equal(KillProcessArgsSchema.safeParse({ pid: -1 }).success, false);
});
