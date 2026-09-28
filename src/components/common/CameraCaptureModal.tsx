import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera as CameraIcon,
  X,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Check,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Tag,
  AlertCircle,
  Sliders,
  Maximize,
  ArrowRight,
} from 'lucide-react';
import {
  isNativeAndroidApp,
  capturePhotoNative,
  pickPhotoFromGallery,
  checkCameraPermissions,
  requestCameraPermissions,
} from '../../services/nativeCameraService';
import { processImageFile } from '../../services/photoStorage';

export interface CapturedPhotoPayload {
  dataUrl: string;
  title: string;
  caption: string;
  date: string;
  location: string;
  category: string;
}

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (photo: CapturedPhotoPayload) => Promise<void> | void;
  defaultCategory?: string;
  defaultLocation?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultCategory = 'Quiet Moments',
  defaultLocation = 'Personal Sanctuary',
}) => {
  const isAndroid = isNativeAndroidApp();

  // Mode: 'rear' (default) or 'front' (selfie)
  const [cameraFacing, setCameraFacing] = useState<'rear' | 'front'>('rear');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Stream & capture state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Review / Preview state
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCaption, setPhotoCaption] = useState('A quiet, unhurried instant captured in your sanctuary.');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoLocation, setPhotoLocation] = useState(defaultLocation);
  const [photoCategory, setPhotoCategory] = useState(defaultCategory);
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup active video stream
  const stopWebStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Handle closing modal
  const handleClose = useCallback(() => {
    stopWebStream();
    setCapturedDataUrl(null);
    setCameraError(null);
    setPermissionDenied(false);
    onClose();
  }, [stopWebStream, onClose]);

  // Handle Android hardware back button
  useEffect(() => {
    if (!isOpen) return;

    const handleBack = (e: Event) => {
      if (capturedDataUrl) {
        setCapturedDataUrl(null);
        e.preventDefault();
      } else {
        handleClose();
        e.preventDefault();
      }
    };

    window.addEventListener('mlw_handle_back_button', handleBack);
    return () => window.removeEventListener('mlw_handle_back_button', handleBack);
  }, [isOpen, capturedDataUrl, handleClose]);

  // Discover web video devices
  const enumerateVideoDevices = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate media devices:', e);
    }
  };

  // Start live web camera viewfinder (only used on browser / web preview)
  const startWebCameraStream = useCallback(
    async (facing: 'rear' | 'front', deviceId?: string) => {
      stopWebStream();
      setCameraError(null);
      setPermissionDenied(false);
      setIsStartingCamera(true);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported in this browser environment.');
        setIsStartingCamera(false);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: facing === 'rear' ? { ideal: 'environment' } : { ideal: 'user' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setCameraStream(stream);
        setIsStartingCamera(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.warn('Video playback notice:', err);
          });
        }

        // Refresh devices with labels now that permission is granted
        enumerateVideoDevices();
      } catch (err: any) {
        console.error('Web camera start error:', err);
        setIsStartingCamera(false);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setPermissionDenied(true);
          setCameraError('Camera permission was denied. Please allow camera permissions in your browser.');
        } else if (err?.name === 'OverconstrainedError' && facing === 'rear') {
          // Fallback to front if environment camera is not available on this device
          startWebCameraStream('front');
        } else {
          setCameraError(err?.message || 'Unable to connect to camera device.');
        }
      }
    },
    [stopWebStream]
  );

  // Trigger Native Android camera capture
  const handleNativeCapture = async (facing: 'rear' | 'front' = cameraFacing) => {
    setCameraError(null);
    setPermissionDenied(false);
    setIsStartingCamera(true);

    try {
      const result = await capturePhotoNative(facing, 92);
      setCapturedDataUrl(result.dataUrl);
      const now = new Date();
      setPhotoTitle(`Moment ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    } catch (err: any) {
      if (err?.message === 'CAMERA_CANCELLED') {
        // User voluntarily pressed back / cancelled in the camera
        return;
      }
      console.warn('[Native Camera Trigger Error]:', err);
      if (err?.message?.includes('permission')) {
        setPermissionDenied(true);
      }
      setCameraError(err?.message || 'Failed to capture photo.');
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Trigger Native Android gallery pick
  const handleNativeGalleryPick = async () => {
    setCameraError(null);
    setIsStartingCamera(true);
    try {
      const result = await pickPhotoFromGallery(92);
      setCapturedDataUrl(result.dataUrl);
      const now = new Date();
      setPhotoTitle(`Moment ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    } catch (err: any) {
      if (err?.message === 'GALLERY_CANCELLED') return;
      setCameraError(err?.message || 'Failed to select photo from gallery.');
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Flip / Switch Camera
  const handleSwitchCameraFacing = () => {
    const nextFacing = cameraFacing === 'rear' ? 'front' : 'rear';
    setCameraFacing(nextFacing);

    if (!isAndroid) {
      startWebCameraStream(nextFacing);
    }
  };

  // Capture snapshot from Web Viewfinder
  const handleWebSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle selfie mirroring if front camera
    if (cameraFacing === 'front') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopWebStream();
    setCapturedDataUrl(dataUrl);
    const now = new Date();
    setPhotoTitle(`Moment ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCameraError(null);
    if (!isAndroid) {
      startWebCameraStream(cameraFacing);
    }
  };

  // Save reviewed photo
  const handleConfirmSave = async () => {
    if (!capturedDataUrl) return;
    setIsSaving(true);
    setCameraError(null);

    try {
      await onSave({
        dataUrl: capturedDataUrl,
        title: photoTitle.trim() || 'Cherished Little Moment',
        caption: photoCaption.trim() || 'A quiet, unhurried instant captured in your sanctuary.',
        date: photoDate,
        location: photoLocation.trim() || 'Personal Sanctuary',
        category: photoCategory,
      });

      handleClose();
    } catch (err: any) {
      console.error('Failed to save memory:', err);
      setCameraError('Failed to save memory: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      setCapturedDataUrl(null);
      setCameraError(null);
      setPermissionDenied(false);
      setCameraFacing('rear');
      const now = new Date();
      setPhotoTitle(`Moment ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
      setPhotoDate(now.toISOString().split('T')[0]);

      if (isAndroid) {
        // Native Android: Directly check permissions and prepare
        checkCameraPermissions();
      } else {
        // Web: Start live viewfinder with rear camera default
        startWebCameraStream('rear');
      }
    } else {
      stopWebStream();
    }
    return () => {
      stopWebStream();
    };
  }, [isOpen, isAndroid, startWebCameraStream, stopWebStream]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-xl bg-[#0D0D0D] border border-[#292929] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#292929] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0]">
              <CameraIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#F5F5F5]">
                {capturedDataUrl
                  ? 'Review & Preserve Moment'
                  : isAndroid
                  ? 'Native Device Camera'
                  : 'Capture Little Moment'}
              </h3>
              <p className="text-[11px] text-[#999999] font-light">
                {isAndroid
                  ? 'Direct hardware capture with rear & selfie support'
                  : 'Live viewfinder with rear/front camera switching'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-[#111111] hover:bg-[#1A1A1A] border border-[#292929] text-[#999999] hover:text-[#F5F5F5] flex items-center justify-center transition-colors cursor-pointer"
            title="Close camera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {/* CAMERA ERROR BANNER */}
          {cameraError && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-normal">{cameraError}</p>
                {permissionDenied && (
                  <p className="text-[11px] text-rose-300/80 font-light">
                    On Android, please go to Android Settings &gt; Apps &gt; Lilverse &gt; Permissions and enable Camera.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* VIEW 1: CAPTURED PHOTO REVIEW & EDIT DETAILS */}
          {capturedDataUrl ? (
            <div className="space-y-4">
              {/* Photo Preview Container */}
              <div className="relative aspect-4/3 rounded-2xl bg-black overflow-hidden border border-[#292929] shadow-inner group">
                <img
                  src={capturedDataUrl}
                  alt="Captured snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-[#C0C0C0] font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Captured Pristine</span>
                </div>
              </div>

              {/* Editable Metadata Form */}
              <div className="space-y-3 bg-[#080808] border border-[#292929] rounded-2xl p-3.5 sm:p-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#999999] mb-1">
                    Moment Title
                  </label>
                  <input
                    type="text"
                    value={photoTitle}
                    onChange={(e) => setPhotoTitle(e.target.value)}
                    placeholder="e.g. Sunny morning tea"
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#999999] mb-1">
                    Caption or Feeling
                  </label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Describe this precious moment..."
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#999999] mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#C0C0C0]" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#999999] mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C0C0C0]" />
                      <span>Location</span>
                    </label>
                    <input
                      type="text"
                      value={photoLocation}
                      onChange={(e) => setPhotoLocation(e.target.value)}
                      placeholder="e.g. Sanctuary"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#999999] mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#C0C0C0]" />
                      <span>Category</span>
                    </label>
                    <select
                      value={photoCategory}
                      onChange={(e) => setPhotoCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                    >
                      <option value="Quiet Moments">Quiet Moments</option>
                      <option value="Adventures">Adventures</option>
                      <option value="Together">Together</option>
                      <option value="Gentle Reflections">Gentle Reflections</option>
                      <option value="Celebrations">Celebrations</option>
                      <option value="Daily Magic">Daily Magic</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            /* VIEW 2: ANDROID NATIVE CAMERA LAUNCHER & CONTROLS */
            <div className="space-y-4 text-center py-2">
              <div className="p-6 rounded-3xl bg-[#080808] border border-[#292929] space-y-4">
                {/* Camera Mode Selector Pills */}
                <div className="inline-flex items-center p-1 rounded-2xl bg-[#000000] border border-[#292929]">
                  <button
                    type="button"
                    onClick={() => setCameraFacing('rear')}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      cameraFacing === 'rear'
                        ? 'silver-btn-primary shadow-md'
                        : 'text-[#999999] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <span>📷 Rear Camera (Default)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraFacing('front')}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      cameraFacing === 'front'
                        ? 'silver-btn-primary shadow-md'
                        : 'text-[#999999] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <span>🤳 Front Camera (Selfie)</span>
                  </button>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 flex flex-col items-center gap-3">
                  <button
                    onClick={() => handleNativeCapture(cameraFacing)}
                    disabled={isStartingCamera}
                    className="w-full max-w-xs py-3.5 px-6 rounded-2xl silver-btn-primary text-sm font-semibold flex items-center justify-center gap-2.5 hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CameraIcon className="w-5 h-5 text-black" />
                    <span>
                      {isStartingCamera
                        ? 'Opening Native Camera...'
                        : cameraFacing === 'rear'
                        ? 'Take Photo with Rear Camera'
                        : 'Take Selfie Photo'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-[#999999]">
                    <span>or</span>
                    <button
                      type="button"
                      onClick={handleNativeGalleryPick}
                      className="text-[#C0C0C0] hover:underline flex items-center gap-1 font-normal cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Choose from Photo Gallery</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#292929] text-[11px] text-[#999999] font-light max-w-md mx-auto">
                  Tapping will launch your phone's native Android camera app with full hardware autofocus, stabilization, and rear/front switching.
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 3: WEB / DESKTOP VIEWFINDER WITH LIVE REAR/FRONT SWITCHING */
            <div className="space-y-3">
              <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-[#292929] flex items-center justify-center shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    cameraFacing === 'front' ? 'scale-x-[-1]' : 'scale-x-100'
                  }`}
                />

                {isStartingCamera && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-[#C0C0C0] space-y-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[#C0C0C0]/30 border-t-[#C0C0C0] animate-spin" />
                    <span className="text-xs font-light text-[#999999]">
                      Activating {cameraFacing === 'rear' ? 'Rear' : 'Front'} Camera...
                    </span>
                  </div>
                )}

                {/* Camera Mode Overlay Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white/90 flex items-center gap-1.5 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{cameraFacing === 'rear' ? 'Rear Camera' : 'Front (Selfie)'}</span>
                </div>

                {/* Flip Camera Control on Viewfinder */}
                <button
                  type="button"
                  onClick={handleSwitchCameraFacing}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white text-xs font-light flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                  title="Switch between Rear and Front camera"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <span>Switch to {cameraFacing === 'rear' ? 'Front' : 'Rear'}</span>
                </button>
              </div>

              {/* Shutter bar */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSwitchCameraFacing}
                  className="p-3 rounded-2xl bg-[#111111] hover:bg-[#1A1A1A] border border-[#292929] text-[#999999] hover:text-[#F5F5F5] transition-all active:scale-95 cursor-pointer"
                  title="Switch Camera (Rear/Front)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleWebSnapshot}
                  disabled={isStartingCamera || !cameraStream}
                  className="px-6 py-3 rounded-2xl silver-btn-primary text-xs font-semibold flex items-center gap-2 hover:scale-102 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <CameraIcon className="w-4 h-4 text-black" />
                  <span>Snap Photo 📸</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#292929] shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#1A1A1A] border border-[#292929] text-xs text-[#999999] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {capturedDataUrl ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-[#1A1A1A] border border-[#292929] text-xs text-[#F5F5F5] transition-colors cursor-pointer disabled:opacity-50"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl silver-btn-primary text-xs font-medium flex items-center gap-1.5 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-black" />
                <span>{isSaving ? 'Preserving...' : 'Save to Scrapbook ✨'}</span>
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-[#999999]">
              {isAndroid ? 'Native Android Mode' : 'Web Viewfinder Mode'}
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
