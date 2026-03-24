import { useEffect, useRef, useState, useCallback } from 'react';

export interface HandPosition {
  x: number;
  y: number;
  isOpen: boolean;
  isRaised: boolean;
  fingerCount: number;
}

interface UseHandTrackingOptions {
  enabled?: boolean;
  onFrame?: (hand: HandPosition | null) => void;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function useHandTracking({ enabled = true, onFrame }: UseHandTrackingOptions) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const handLandmarkerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const setVideoElement = useCallback((node: HTMLVideoElement | null) => {
    videoElementRef.current = node;
  }, []);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoElementRef.current) {
      videoElementRef.current.pause();
      videoElementRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    const attempts: MediaStreamConstraints[] = [
      { video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' }, audio: false },
      { video: { width: { ideal: 320 }, height: { ideal: 240 } }, audio: false },
      { video: true, audio: false },
    ];

    let lastError: any = null;

    for (let i = 0; i < attempts.length; i++) {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        console.log(`[HandTracking] Camera attempt ${i + 1}`);
        const stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
        return stream;
      } catch (err: any) {
        lastError = err;
        console.warn(`[HandTracking] Camera attempt ${i + 1} failed:`, err);

        if (err?.name === 'NotReadableError') {
          await wait(600);
          continue;
        }

        if (err?.name === 'OverconstrainedError') {
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setIsReady(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        setError(null);
        setIsReady(false);
        console.log('[HandTracking] Starting init...');

        const vision = await import('@mediapipe/tasks-vision');
        const { HandLandmarker, FilesetResolver } = vision;
        if (cancelled) return;
        console.log('[HandTracking] MediaPipe imported');

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
        if (cancelled) return;
        console.log('[HandTracking] FilesetResolver ready');

        let handLandmarker: any;
        try {
          handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
          });
        } catch (gpuErr) {
          console.warn('[HandTracking] GPU failed, trying CPU:', gpuErr);
          handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
          });
        }

        if (cancelled) return;
        handLandmarkerRef.current = handLandmarker;
        console.log('[HandTracking] HandLandmarker created');

        const stream = await startCamera();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoElementRef.current;
        if (!video) {
          throw new Error('Video element not ready');
        }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        if (cancelled) return;
        setIsReady(true);
        console.log('[HandTracking] Camera started');

        let lastTime = -1;
        const detect = () => {
          if (cancelled) return;
          animFrameRef.current = requestAnimationFrame(detect);

          const currentVideo = videoElementRef.current;
          if (!currentVideo || currentVideo.readyState < 2) return;

          const now = performance.now();
          if (now === lastTime) return;
          lastTime = now;

          try {
            const result = handLandmarkerRef.current?.detectForVideo(currentVideo, now);

            if (result?.landmarks?.length > 0) {
              const landmarks = result.landmarks[0];
              const wrist = landmarks[0];
              const tips = [4, 8, 12, 16, 20];
              const mcps = [2, 5, 9, 13, 17];

              let fingerCount = 0;
              for (let i = 0; i < 5; i++) {
                if (landmarks[tips[i]].y < landmarks[mcps[i]].y) {
                  fingerCount++;
                }
              }

              // Use middle finger tip for more responsive Y tracking
              const middleTip = landmarks[12];

              onFrameRef.current?.({
                x: 1 - wrist.x,
                y: middleTip.y,
                isOpen: fingerCount >= 3,
                isRaised: wrist.y < 0.55,
                fingerCount,
              });
            } else {
              onFrameRef.current?.(null);
            }
          } catch {
            // ignore per-frame detection errors
          }
        };

        detect();
      } catch (err: any) {
        if (!cancelled) {
          console.error('Hand tracking init error:', err);
          if (err?.name === 'NotReadableError') {
            setError('Camera is busy in another app or tab. Close other camera apps and try again.');
          } else if (err?.name === 'NotAllowedError') {
            setError('Camera access was blocked. Please allow camera access and try again.');
          } else {
            setError(err?.message || 'Failed to initialize hand tracking');
          }
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [enabled, cleanup, startCamera]);

  return { setVideoElement, isReady, error };
}
