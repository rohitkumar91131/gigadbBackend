const fs = require('fs');
const fsp = require('fs/promises');
const BPlusTree = require('./BPlusTree');


async function readRecord(filePath, offset) {
    let fd = null;
    try {
        fd = await fsp.open(filePath, 'r');
        let buffer = Buffer.alloc(0);
        let chunk = Buffer.alloc(256); 
        let position = offset;

        while (true) {
            const { bytesRead } = await fd.read(chunk, 0, chunk.length, position);
            if (bytesRead === 0) break;

            buffer = Buffer.concat([buffer, chunk.slice(0, bytesRead)]);
            
            // Look for newline
            const newLineIndex = buffer.indexOf('\n');
            if (newLineIndex !== -1) {
                buffer = buffer.slice(0, newLineIndex);
                break;
            }
            position += bytesRead;
        }
        const str = buffer.toString('utf8').trim();
        if (!str) return null;
        return JSON.parse(str);

    } finally {
        if (fd) await fd.close();
    }
}

async function appendRecord(filePath, dataObj) {
    const line = JSON.stringify(dataObj) + "\n";
    const stats = await fsp.stat(filePath).catch(() => ({ size: 0 }));
    const offset = stats.size;
    
    await fsp.appendFile(filePath, line, "utf8");
    return offset;
}

module.exports = { readRecord, appendRecord };