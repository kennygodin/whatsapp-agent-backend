import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

export interface AdminTool<Input extends z.ZodObject = z.ZodObject> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Input;
  readonly annotations: ToolAnnotations;
  execute(input: z.infer<Input>): Promise<unknown>;
}

export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: false,
};
