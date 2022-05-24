import { BrowserClient } from "//unpkg.com/@speechly/browser-client?module=true"

const meeting = new Meeting();
const speechly = new BrowserClient({
  appId: "84919e7d-9af6-40be-9c76-ecc03aef984d",
  // debug: true,
  // logSegments: true,
  vad: { enabled: true, noiseGateDb: -24.0 }
});

speechly.onSegmentChange(segment => {
  if (segment) {
    let tentative = segment.words.map(w => w.value.toLowerCase()).join(" ");
    let div = document.createElement("div");
    let id = segment.contextId + "-" + segment.id
    div.id = id
    div.className = "segment";
    div.textContent = tentative;

    let segmentDiv = document.getElementById(id)
    if (segmentDiv) segmentDiv.textContent = tentative
    if (!segmentDiv) transcriptList.appendChild(div)

    if (segment.isFinal) {
      let transcript = segment.words.map(w => w.value.toLowerCase()).join(" ");
      segmentDiv.textContent = transcript;
    }
  }
});

const transcriptList = document.getElementById("transcript-list");
const meetingLobby = document.getElementById("lobby");
const meetingRoom = document.getElementById("meeting");
const roomName = document.getElementById("room-name");
const streamsContainer = document.getElementById("streams-container");
const newMeetingBtn = document.getElementById("new-meeting");
const joinMeetingBtn = document.getElementById("join-meeting");
const copyRoomBtn = document.getElementById("copy-room");
const leaveRoomBtn = document.getElementById("leave-room");

function setupMeetingRoom(roomid) {
  meetingLobby.style.display = "none";
  meetingRoom.style.display = "grid";
  roomName.textContent = roomid;
}

meeting.onmeeting = function(room) {
  if (!room) return

  joinMeetingBtn.onclick = function() {
    let id = document.getElementById("meeting-room-id").value;
    if (id !== room.roomid) return
    meeting.meet(room)
    setupMeetingRoom(room.roomid)
  }
};

meeting.onaddstream = async function(e) {
  await speechly.detach();
  await speechly.attach(e.stream);

  e.video.controls = false;
  if (e.type == "local") streamsContainer.insertBefore(e.video, streamsContainer.firstChild);
  if (e.type == "remote") streamsContainer.appendChild(e.video);
};

meeting.openSignalingChannel = function(onmessage) {
  let channel = location.href.replace(/\/|:|#|%|\.|\[|\]/g, "");
  let websocket = new WebSocket("wss://muazkhan.com:9449/");
  websocket.onopen = function() {
    websocket.push(JSON.stringify({
      open: true,
      channel: channel
    }));
  };
  websocket.push = websocket.send;
  websocket.send = function(data) {
    if (websocket.readyState != 1) {
      return setTimeout(function() {
        websocket.send(data);
      }, 300);
    }

    websocket.push(JSON.stringify({
      data: data,
      channel: channel
    }));
  };
  websocket.onmessage = function(e) {
    onmessage(JSON.parse(e.data));
  };
  return websocket;
};

meeting.onuserleft = function(userid) {
  let video = document.getElementById(userid);
  if (video) video.parentNode.removeChild(video);
};

meeting.check();

newMeetingBtn.onclick = function() {
  let roomid = Math.random().toString(36).slice(2, 10)
  meeting.setup(roomid);
  setupMeetingRoom(roomid)
};

copyRoomBtn.onclick = function() {
  navigator.clipboard.writeText(roomName.textContent)
}

leaveRoomBtn.onclick = function() {
  meeting.leave();
  location.reload();
};