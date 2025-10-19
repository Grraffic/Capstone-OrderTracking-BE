const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const authController = require("../controllers/auth.controller");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  authController.oauthCallback
);

// Email/password signup and login
router.post("/signup", authController.emailSignup);
router.post("/login", authController.emailLogin);

module.exports = router;
