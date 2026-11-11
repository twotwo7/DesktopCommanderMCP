import { z } from 'zod';

/** Generate the public input contract from the same patched schemas used to parse calls. */
export function toolJsonSchema(schema: z.ZodType) {
    return z.toJSONSchema(schema, {
        target: 'draft-07',
        io: 'input',
        override: ({ zodSchema, jsonSchema }) => {
            // Match the original tool catalog's unknown-key contract. Explicit
            // record/passthrough fields keep their own additionalProperties.
            if (zodSchema instanceof z.ZodObject && !zodSchema.def.catchall) {
                jsonSchema.additionalProperties = false;
            }
        },
    });
}
