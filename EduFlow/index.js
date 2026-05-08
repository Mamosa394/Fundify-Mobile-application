import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';

// Polyfill Buffer globally for react-native-svg
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

import App from './App'; // Ensure this path points to your App.js

// This registers the main component of your app
registerRootComponent(App);