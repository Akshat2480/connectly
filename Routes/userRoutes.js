const express = require("express");
const userController = require("../controller/userController");
const authController = require("../controller/authController");

const router = express.Router();

router.route("/").get(userController.getUsers);
router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;
