/**
 * @format
 */

import { AppRegistry } from 'react-native';
import 'web-streams-polyfill'; // Полифилл для ReadableStream
import App from './App';

AppRegistry.registerComponent('MindForge', () => App);
