/// <reference types="vite/client" />

declare module '@mediapipe/tasks-vision' {
  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<any>;
  }

  export class HandLandmarker {
    static createFromOptions(resolver: any, options: any): Promise<HandLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestamp: number): {
      landmarks: Array<Array<{ x: number; y: number; z: number }>>;
    };
  }
}
