import { WebSocket } from 'ws';

/**
 * One connected socket. `userId` is null for spectators -- visitors who opened
 * the lot without signing in. They receive every broadcast but cannot bid,
 * which is what lets a logged-out visitor watch a live auction.
 */
export class User {
  constructor(
    public readonly socket: WebSocket,
    public readonly userId: string | null,
    public readonly auctionId: string
  ) {}

  get canBid(): boolean {
    return this.userId !== null;
  }

  send(payload: unknown) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }
}
