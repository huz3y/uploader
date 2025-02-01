import net from "net";
import fs from "fs/promises";

// Creating our server
const server = net.createServer((socket) => {});

// listening to connection event
server.on("connection", (socket) => {
  console.log("New connection!");

  let fileHandle, writable;
  let isWritable = -1;

  // Listening to data event
  socket.on("data", async (data) => {
    if (!fileHandle) {
      // pausing reading from socket client till fileHandle is open
      socket.pause();
      // Doing string manipulation to get the data name
      const indexOfdivider = data.indexOf("-------");
      const fileName = data.subarray(10, indexOfdivider).toString("utf-8");
      // Save the data to a specific path (/storage/**filename**/) by opening file handle on that path
      fileHandle = await fs.open(`storage/${fileName}`, "w");
      // Create a write stream (Notice that socket is also a readable stream, so we will read from socket and write to stream)
      writable = fileHandle.createWriteStream();
      // listen for drain event to handle backpressure
      writable.on("drain", () => {
        // when buffer drained resume reading
        socket.resume();
      });
      // Writing to our dest file also remove header
      isWritable = writable.write(data.subarray(indexOfdivider + 7));
      // Resume reading from socket client since fileHandle is now open
      socket.resume();
    } else {
      // Writing to our dest file and discard the headers
      isWritable = writable.write(data);
    }
    // Pause if writable internal buffer is full
    if (!isWritable) socket.pause();
  });

  socket.on("end", async () => {
    console.log("Connection, ended");
    // closing the file
    if (fileHandle) await fileHandle.close();
    // Resetting the variables
    fileHandle = undefined;
    writable = undefined;
    isWritable = -1;
  });
  socket.on("error", (err) => {
    console.error("Error: ", err);
  });
  socket.on("close", (hadError) => {
    if (hadError) console.log("Server closed due to error");
    console.log("Server closed");
  });
});

// firing up server
server.listen(8080, "::1", () => {
  console.log(
    `Uploader server opened on: https://[${server.address().address}]:${
      server.address().port
    }`
  );
});
