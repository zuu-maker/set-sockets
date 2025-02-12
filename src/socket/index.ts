import { Socket } from "socket.io";
import type { Chat, Participant, Raisehand, Room } from "./types.js";

// add a current room and add defensive programming

// we also need a get history to ensure connsistency

const ioSocket = (io: any) => {
  let rooms = new Map<string, Room>();

  io.on("connection", (socket: Socket) => {
    console.log("connected", socket.id);

    let participants: Participant[] = [];
    // joins a room
    socket.on("join_room", async (roomId: string, participant: Participant) => {
      console.log("participant data", participant);
      console.log("room id", roomId);

      let room = rooms.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          participants: [],
          chats: [],
          notAllowedTexters: new Set(),
          allowedSpeakers: new Set(),
          bannedUsers: new Set(),
          raisedHands: new Set(),
        };
        rooms.set(roomId, room);
      }

      const exists = room.participants.some(
        (item) => item.id === participant.id
      );

      socket.join(roomId);
      console.log(exists);
      if (!exists) {
        room.participants.push(participant);
      }
      console.log("room", room);
      // console.log(room.participants);

      io.to(roomId).emit("updated_participants", room.participants);
    });

    socket.on("send_text", (roomId: string, chat: Chat) => {
      console.log("chat", chat);
      let room = rooms.get(roomId);
      if (!room) return;

      room.chats.push(chat);
      io.to(roomId).emit("updated_chat", room.chats);
    });

    socket.on("raise_hand", (roomId: string, raiseHand: Raisehand) => {
      console.log("hand was raised", raiseHand);
      let room = rooms.get(roomId);
      if (!room) return;

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

      if (!room) return;

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

      if (!room) return;

      room.notAllowedTexters.delete(userId);
      io.to(roomId).emit(
        "updated_revoked_text_permission",
        Array.from(room.notAllowedTexters)
      );
    });

    socket.on("ban_user", (roomId: string, userId: string) => {
      console.log("banned user id: ", userId);

      let room = rooms.get(roomId);

      if (!room) return;

      room.bannedUsers.add(userId);
      io.to(roomId).emit("remove_banned_user", userId);
    });
  });
};

export default ioSocket;
