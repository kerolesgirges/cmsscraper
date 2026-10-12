const { once } = require("events");

async function streamBuffer(res, value, chunkSize = 64 * 1024) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    if (!res.write(buffer.subarray(offset, offset + chunkSize))) {
      await once(res, "drain");
    }
  }
  res.end();
}

module.exports = { streamBuffer };
