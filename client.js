import net from "net";
import fs from "fs/promises";
import path from "path";

let isWritable = -1;

// Clears the current line
const clearLine = (dir) => {
  return new Promise((resolve, reject) => {
    process.stdout.clearLine(dir, () => {
      resolve();
    });
  });
};

// Moves the cursor to a spceific position
const moveCursor = (dx, dy) => {
  return new Promise((resolve, reject) => {
    process.stdout.moveCursor(dx, dy, () => {
      resolve();
    });
  });
};

// Creating a client socket connection
const socket = net.createConnection({ host: "::1", port: 8080 }, async () => {
  // file path is the 3rd thing user writes in the console
  const filePath = process.argv[2];
  const fileName = path.basename(filePath);
  const fileHandle = await fs.open(filePath, "r");
  const readable = fileHandle.createReadStream();
  // To calculate how much percentage has uploaded
  const fileSize = (await fileHandle.stat()).size;
  let uploadedPercentage = 0;
  let bytesUploaded = 0;

  // writing the filename to the stream, we need some identifiers to separate it from the actual data
  socket.write(`fileName: ${fileName}-------`);

  // Reading from the source file
  readable.on("data", async (data) => {
    isWritable = socket.write(data);
    if (!isWritable) readable.pause();
    // add number of bytes read to variable
    bytesUploaded += data.length;
    // calculating percentage now
    let newPercentage = Math.floor((bytesUploaded / fileSize) * 100);
    if (newPercentage !== uploadedPercentage) {
      if (uploadedPercentage !== 0) await moveCursor(0, -1);
      uploadedPercentage = newPercentage;
      await clearLine(0);
      if (uploadedPercentage !== 100)
        console.log(`Uploading... ${uploadedPercentage}%`);
      if (uploadedPercentage === 100) console.log("Uploaded!");
    }
  });

  // listening for drain event on socket to handle backpressure
  socket.on("drain", () => {
    // when buffer drained resume reading
    readable.resume();
  });

  fileHandle.on("end", async () => {
    console.log("The file was successfully uploaded!");
    // closing file handle
    await fileHandle.close();
    // Ending connection
    socket.end();
  });
});
