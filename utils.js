const fs = require("fs");
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

module.exports = {
  log,
  readTextFile,
};
