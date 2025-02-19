export interface Participant {
  id: string;
  socketId: string;
  namee: string;
  isVideoOff: boolean;
  isMuted: boolean;
  isActive: boolean;
}

// you already have is muted and is video off
export interface StudentMuteState {
  id: string;
  kind: string;
  muted: boolean;
}

export interface Chat {
  content: string;
  sender: string;
  senderId: string;
  timestamp: Date;
}

export interface Raisehand {
  id: string;
  name: string;
  targetUserId: string;
  timestamp: Date;
} // this will be a set to ensure uniqueness

export interface Room {
  id: string;
  participants: Participant[];
  chats: Chat[];
  raisedHands: Set<Raisehand>;
  notAllowedTexters: Set<string>;
  allowedSpeakers: Set<string>;
  bannedUsers: Set<string>;
  teacherMuteStates: TeacherMuteState;
}

export interface TeacherMuteState {
  audio: boolean;
  video: boolean;
}

export interface MuteState {
  kind: string;
  muted: boolean;
}
