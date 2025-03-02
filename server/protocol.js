// protocol.js
const { EventEmitter } = require("events");
const zlib = require("zlib");
const crypto = require("crypto");

function debugProtocol(...args) {
  if (process.env.GIT_DEBUG) {
    console.log("[PROTOCOL]", ...args);
  }
}

const ZeroIdStr = "0".repeat(40);
const FlushPkt = Buffer.from("0000", "utf8");

// Convert partial buffers into valid pkt-lines
function toPktLine(...args) {
  // Combine them
  let buffer = Buffer.concat(args.map((x) => (typeof x === "string" ? Buffer.from(x) : x)));
  let length = buffer.length + 4; // 4 bytes for length
  let lengthHex = length.toString(16).padStart(4, "0");
  return Buffer.concat([Buffer.from(lengthHex, "utf8"), buffer]);
}

function flushPkt() {
  return FlushPkt;
}

// We adapt the approach from CloudGit: handle getRefs, handle git-upload-pack, handle git-receive-pack

class GitProtocol extends EventEmitter {
  constructor() {
    super();
  }

  static toPktLine = toPktLine;
  static flushPkt = flushPkt;
  static ZeroIdStr = ZeroIdStr;
  static debugProtocol = debugProtocol;
}

module.exports = { GitProtocol, toPktLine, flushPkt, ZeroIdStr };
