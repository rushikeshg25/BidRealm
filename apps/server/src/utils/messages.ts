/** Message types a client may send. */
export const BID = "bid";

/** Message types the server sends. */
export const JOINED = "JOINED";
export const TIME_LEFT = "TIME_LEFT";
export const NEW_BID = "BID";
export const ERROR = "ERROR";
export const AUCTION_ENDED = "AUCTION_ENDED";

// `EXITAUCTION = "exitAuction"` was declared here and handled nowhere. Leaving
// the auction is just closing the socket.
