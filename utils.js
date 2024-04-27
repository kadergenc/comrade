const fs = require("fs");
const os = require("os");
const iconv = require("iconv-lite");
const detectCharacterEncoding = require("detect-character-encoding");

const DEBUG = true;

const log = (...args) => {
  if (DEBUG === true) {
    console.log(">> ", ...args);
  }
};

/*
 * Read file given paths content as text. Automatically detects the encoding of the file
 */
const readTextFile = (path) => {
  const contents = fs.readFileSync(path);
  const encoding = detectCharacterEncoding(contents).encoding;

  return iconv.decode(contents, encoding);
};

const createTempFile = (text) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "comrade_temp"));
  const tempFilePath = path.join(tmpDir, `comrade_temp_file`);
  fs.writeFileSync(tempFilePath, text);
  return tempFilePath;
};

module.exports = {
  log,
  readTextFile,
  createTempFile,
};
