const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose = require("mongoose");

const Users = require('../Model/Users'); 

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "39544933929-27i7d3a8q1eb6225dveqben57dvcta0q.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let existingUser = await Users.findOne({
          email: profile.emails[0].value,
        });

        if (existingUser) return done(null, existingUser);

        const cart = {};
        for (let i = 0; i < 300; i++) cart[i] = 0;

        const newUser = await new Users({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: "", // leave blank for social login
          authProvider: "google",
          cartData: cart,
          WishlistData: {},
        }).save();

        done(null, newUser);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id); // ✅ Correct: use user._id from the authenticated user
});

passport.deserializeUser((id, done) => {
  Users.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err));
});
