import type { Response } from 'express';
import type { SseEvent } from 'react-ai-core';

export class SseManager {
  private clients = new Map<string, Response[]>();

  addClient(sessionId: string, res: Response): void {
    if (!this.clients.has(sessionId)) this.clients.set(sessionId, []);
    this.clients.get(sessionId)!.push(res);
  }

  removeClient(sessionId: string, res: Response): void {
    const clients = this.clients.get(sessionId);
    if (!clients) return;
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
  }

  send(sessionId: string, event: SseEvent): void {
    const clients = this.clients.get(sessionId) ?? [];
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
      client.write(data);
    }
  }

  clientCount(sessionId: string): number {
    return this.clients.get(sessionId)?.length ?? 0;
  }
}
