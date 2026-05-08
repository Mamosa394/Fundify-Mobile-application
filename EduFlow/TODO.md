# EduFlow Navigation Fix TODO

- [x] Update `App.js` to mount Welcome/Login/Signup inside React Navigation stack (remove `showWelcome` early return and direct screen rendering).
- [x] Update `WelcomeScreen.js` to accept `navigation` prop and navigate to `Login` when onboarding ends (remove direct `<LoginScreen />` rendering).
- [x] Update `SignupScreen.js` to use navigation back when `onBack` isn’t provided, and optionally navigate after successful signup.

- [ ] Run app / sanity check navigation flow: Welcome -> Login -> Signup.



