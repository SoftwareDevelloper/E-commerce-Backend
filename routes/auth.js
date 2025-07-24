const express = require("express");
const passport = require("passport");

const router = express.Router();

// Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:3000", // frontend redirect
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Send token or redirect to frontend
    res.redirect(`http://localhost:3000?token=auth-token`);
  }
);

// Handle failure
router.get("/google/failure", (req, res) => {
  res.send("Failed to authenticate with Google.");
});

module.exports = router;
