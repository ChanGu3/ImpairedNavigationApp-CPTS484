declare module "react-native-voice" {
  export type SpeechResultsEvent = { value?: string[] };
  export type SpeechPartialResultsEvent = { value?: string[] };
  export type SpeechErrorEvent = { error?: { message?: string } };

  const Voice: {
    onSpeechResults?: (e: SpeechResultsEvent) => void;
    onSpeechPartialResults?: (e: SpeechPartialResultsEvent) => void;
    onSpeechEnd?: () => void;
    onSpeechError?: (e: SpeechErrorEvent) => void;

    start(locale?: string): Promise<void>;
    stop(): Promise<void>;
    cancel(): Promise<void>;
    destroy(): Promise<void>;
    isAvailable(): Promise<boolean>;
  };

  export default Voice;
}
