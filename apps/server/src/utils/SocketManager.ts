import { WebSocket } from "ws";

export class User {
  public userId: string;
  public socket: WebSocket;
  public auctionId: string;

  /**
   * Set false before each ping and back to true on pong. A socket that misses a
   * cycle is half-open and gets terminated -- otherwise a client that vanished
   * without a close frame stays in the participant list forever.
   */
  public isAlive = true;

  constructor(socket: WebSocket, userId: string, auctionId: string) {
    this.socket = socket;
    this.userId = userId;
    this.auctionId = auctionId;
  }
}

// The `SocketManager` singleton class that used to live here had an empty body,
// was never exported and was never referenced.
