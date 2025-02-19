import { Socket } from "socket.io";
import type { Chat, MuteState, Participant, Raisehand, Room } from "./types.js";

// add a current room and add defensive programming

// we also need a get history to ensure connsistency
//io.to(roomId) is to everyone in the room
//soclet.to(roomId) is to everyone in the room except the socket id
const ioSocket = (io: any) => {
  let rooms = new Map<string, Room>();

  io.on("connection", (socket: Socket) => {
    console.log("connectd", socket.id);
    let participants: Participant[] = [];
    let currentRoomId: string = "";
    // joins a room
    socket.on("join_room", async (roomId: string, participant: Participant) => {
      let room = rooms.get(roomId);
      currentRoomId = roomId;
      if (!room) {
        room = {
          id: roomId,
          participants: [],
          chats: [],
          notAllowedTexters: new Set(),
          allowedSpeakers: new Set(),
          bannedUsers: new Set(),
          raisedHands: new Set(),
          teacherMuteStates: { audio: false, video: false },
        };
        rooms.set(roomId, room);
      } else {
        if (room.bannedUsers.has(participant.id)) {
          socket.emit("error", "banned");
          return;
        }

        socket.emit("history", {
          allowedSpeakers: Array.from(room.allowedSpeakers),
          notAllowedTexters: Array.from(room.notAllowedTexters),
          _isAudioMuted: room.teacherMuteStates.audio,
          _isVideoMuted: room.teacherMuteStates.video,
        });
      }

      const exists = room.participants.some(
        (item) => item.id === participant.id
      );

      socket.join(roomId);
      if (!exists) {
        room.participants.push({ ...participant, socketId: socket.id });
      }
      // console.log(room.participants);

      io.to(roomId).emit("updated_participants", room.participants);
    });

    socket.on("send_text", (roomId: string, chat: Chat) => {
      console.log("chat", chat);
      let room = rooms.get(roomId);
      if (!room) {
        socket.emit("error", "room");
        return;
      }

      room.chats.push(chat);
      io.to(roomId).emit("updated_chat", room.chats);
    });

    socket.on("raise_hand", (roomId: string, raiseHand: Raisehand) => {
      let room = rooms.get(roomId);
      if (!room) {
        socket.emit("error", "room");
        return;
      }

      room.raisedHands.add(raiseHand); // try see if u cann send a message to a specific socket
      socket
        .to(roomId)
        .emit("updated_rasied_hands", Array.from(room.raisedHands)); // here double check raised hands we can simply have one event consistency is ot necessary because only the teacher listens for this event
      socket.to(roomId).emit("raised_hand", raiseHand); // double chheck the sockeet.to as well
    });

    // revoke a students text permissions
    socket.on("revoke_text_permission", (roomId: string, userId: string) => {
      console.log("user id", userId);
      let room = rooms.get(roomId);

      if (!room) {
        socket.emit("error", "room");
        return;
      }

      room.notAllowedTexters.add(userId);
      io.to(roomId).emit(
        "updated_revoked_text_permission",
        Array.from(room.notAllowedTexters)
      );
    });

    // grrant a user back text permissions
    socket.on("grant_text_permission", (roomId: string, userId: string) => {
      console.log("user id in grant", userId);

      let room = rooms.get(roomId);

      if (!room) {
        socket.emit("error", "room");
        return;
      }

      room.notAllowedTexters.delete(userId);
      io.to(roomId).emit(
        "updated_revoked_text_permission",
        Array.from(room.notAllowedTexters)
      );
    });

    socket.on("ban_user", (roomId: string, userId: string) => {
      console.log("banned user id: ", userId);

      let room = rooms.get(roomId);

      if (!room) {
        socket.emit("error", "room");
        return;
      }

      room.bannedUsers.add(userId);

      console.log("after add", room.bannedUsers);
      io.to(roomId).emit("remove_banned_user", userId);
    });

    socket.on("leave_meeting", (roomId: string, userId: string) => {
      // i can also check if the room id is eual to the currentRoomid

      let room = rooms.get(roomId);

      if (!room) {
        socket.emit("error", "room");
        return;
      }
      // remove user from raised hands
      room.raisedHands = new Set(
        Array.from(room.raisedHands).filter((r) => r.id !== userId)
      );
      // remove user from participants
      room.participants = room.participants.filter((p) => p.id !== userId);

      // update the participants and raised hands from end
      socket
        .to(roomId)
        .emit("updated_rasied_hands", Array.from(room.raisedHands));
      socket.to(roomId).emit("updated_participants", room.participants);

      socket.emit("left_meeting");
    });

    socket.on("end_meeting", (roomId: string) => {
      // get the room
      let room = rooms.get(roomId);

      if (!room) {
        socket.emit("error", "room");
        return;
      }

      rooms.delete(roomId);
      // delete the room
      io.emit("meeting_ended");

      // end back to users
    });

    socket.on("disconnect", () => {
      if (currentRoomId.length !== 0) {
        let room = rooms.get(currentRoomId);

        if (room) {
          room.participants = room.participants.filter(
            (participant) => participant.socketId !== socket.id
          );

          io.to(currentRoomId).emit("updated_participants", room.participants);

          if (room.participants.length === 0) {
            {
              rooms.delete(currentRoomId);
            }
          }
        }
      }
    });

    socket.on("mute_state", (roomId: string, muteState: MuteState) => {
      let room = rooms.get(roomId);

      if (!room) {
        socket.emit("error", "room");
        return;
      }

      if (muteState.kind === "audio") {
        room.teacherMuteStates.audio = muteState.muted;
      }

      if (muteState.kind === "video") {
        room.teacherMuteStates.video = muteState.muted;
      }

      socket.to(roomId).emit("updated_mute_state", muteState);
    });
  });
};

export default ioSocket;
