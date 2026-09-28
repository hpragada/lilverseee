import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, CameraDirection, PermissionStatus } from '@capacitor/camera';

export interface CameraCaptureResult {
  dataUrl: string;
  format?: string;
  source: 'native-camera' | 'web-camera' | 'gallery';
  direction: 'rear' | 'front';
}

export interface CameraPermissionState {
  granted: boolean;
  canRequest: boolean;
  status: string;
  message?: string;
}

/**
 * Check if the application is running as an installed native Android (or iOS) app
 */
export function isNativeAndroidApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check Camera permissions on both native mobile and web environments
 */
export async function checkCameraPermissions(): Promise<CameraPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm: PermissionStatus = await Camera.checkPermissions();
      const isGranted = perm.camera === 'granted';
      const canRequest = perm.camera === 'prompt' || perm.camera === 'prompt-with-rationale';
      return {
        granted: isGranted,
        canRequest: canRequest || perm.camera === 'granted',
        status: perm.camera,
        message: isGranted
          ? 'Camera permission granted'
          : 'Camera access is required to take photos.',
      };
    } catch (err: any) {
      console.warn('[Native Camera] Permission check error:', err);
      return {
        granted: false,
        canRequest: true,
        status: 'prompt',
        message: 'Could not check native camera permission.',
      };
    }
  }

  // Web environment permission check
  if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
    try {
      // @ts-ignore - 'camera' name query is standard in modern browsers
      const status = await navigator.permissions.query({ name: 'camera' as any });
      return {
        granted: status.state === 'granted',
        canRequest: status.state !== 'denied',
        status: status.state,
        message:
          status.state === 'denied'
            ? 'Camera access is blocked in your browser permissions.'
            : undefined,
      };
    } catch {
      // Fall through to default
    }
  }

  return {
    granted: true,
    canRequest: true,
    status: 'prompt',
  };
}

/**
 * Request camera permission explicitly
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await Camera.requestPermissions({ permissions: ['camera'] });
      return res.camera === 'granted';
    } catch (err) {
      console.error('[Native Camera] Permission request failed:', err);
      return false;
    }
  }
  return true;
}

/**
 * Capture photo using native Android / Capacitor Camera hardware
 */
export async function capturePhotoNative(
  direction: 'rear' | 'front' = 'rear',
  quality: number = 92
): Promise<CameraCaptureResult> {
  // Ensure permissions before launching native camera activity
  const perm = await checkCameraPermissions();
  if (!perm.granted) {
    const granted = await requestCameraPermissions();
    if (!granted) {
      throw new Error(
        'Camera permission was denied. Please allow Camera permission in your device Settings to take photos.'
      );
    }
  }

  try {
    const photo = await Camera.getPhoto({
      quality,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      direction: direction === 'front' ? CameraDirection.Front : CameraDirection.Rear,
      correctOrientation: true,
      saveToGallery: false,
    });

    if (!photo.dataUrl) {
      throw new Error('No photo data received from device camera.');
    }

    return {
      dataUrl: photo.dataUrl,
      format: photo.format,
      source: 'native-camera',
      direction,
    };
  } catch (err: any) {
    // Check if user cancelled
    if (
      err?.message?.includes('cancelled') ||
      err?.message?.includes('canceled') ||
      err?.message?.includes('User cancelled')
    ) {
      throw new Error('CAMERA_CANCELLED');
    }
    console.error('[Native Camera] Capture error:', err);
    throw new Error(err?.message || 'Failed to capture photo with device camera.');
  }
}

/**
 * Pick photo directly from native device gallery
 */
export async function pickPhotoFromGallery(quality: number = 92): Promise<CameraCaptureResult> {
  try {
    const photo = await Camera.getPhoto({
      quality,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
    });

    if (!photo.dataUrl) {
      throw new Error('No photo selected.');
    }

    return {
      dataUrl: photo.dataUrl,
      format: photo.format,
      source: 'gallery',
      direction: 'rear',
    };
  } catch (err: any) {
    if (
      err?.message?.includes('cancelled') ||
      err?.message?.includes('canceled') ||
      err?.message?.includes('User cancelled')
    ) {
      throw new Error('GALLERY_CANCELLED');
    }
    throw new Error(err?.message || 'Failed to select photo from device gallery.');
  }
}
