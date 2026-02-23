import fs from 'fs';
import path from 'path';

const LOG_PATH = path.resolve('prompts.txt');

function timestamp(): string {
  return new Date().toISOString();
}

export function logPrompt(label: string, content: string): void {
  if (process.env.DEBUG !== 'true') return;

  const separator = '─'.repeat(72);
  const entry = `\n${separator}\n[${timestamp()}] ${label}\n${separator}\n${content}\n`;

  fs.appendFileSync(LOG_PATH, entry, 'utf8');
}
