export type Platform = "youtube" | "netflix";

export type Room = {
  id: string;
  owner_id: string;
  platform: Platform;
  source: string;
  created_at: string;
};

export type RoomMember = {
  room_id: string;
  user_id: string;
  role: "host" | "viewer";
  joined_at: string;
};

export type RoomMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type SyncEventType = "PLAY" | "PAUSE" | "SEEK" | "SET_SOURCE" | "PING";

export type SyncEvent = {
  type: SyncEventType;
  payload: {
    roomId: string;
    platform: Platform;
    videoTime?: number;
    ts: number;
    sourceUrl?: string;
    videoId?: string;
  };
  senderId: string;
};