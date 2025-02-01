import { AppRegistry } from 'react-native';
import ShareHandler from './src/share/ShareHandler';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName + 'Share', () => ShareHandler);