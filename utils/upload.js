const multer = require("multer");
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb(new AppError("The file type must be a image", 400), false);
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

module.exports = upload;
