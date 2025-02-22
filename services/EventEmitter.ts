import { NativeEventEmitter, NativeModules } from 'react-native';

const { UrlProcessingModule } = NativeModules;

// Create event emitter for URL processing
export const urlProcessingEmitter = new NativeEventEmitter(UrlProcessingModule);