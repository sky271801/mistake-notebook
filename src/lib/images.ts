import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const loadImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };
    image.src = url;
  });

export const compressImage = async (blob: Blob, maxSize: number, quality: number) => {
  const image = await loadImage(blob);
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法处理图片');
  }
  context.drawImage(image, 0, 0, width, height);
  const output = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('图片压缩失败'));
    }, 'image/jpeg', quality);
  });
  return { blob: output, width, height };
};

export const pickImagesFromDevice = async () => {
  const result = await Camera.pickImages({
    quality: 88,
    limit: 0
  });

  const files = await Promise.all(
    result.photos.map(async (photo, index) => {
      if (!photo.webPath) {
        throw new Error('没有拿到图片路径');
      }
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      return new File([blob], `gallery-${Date.now()}-${index}.jpg`, {
        type: blob.type || 'image/jpeg'
      });
    })
  );

  return files;
};

export const takePhotoFromCamera = async () => {
  const photo = await Camera.getPhoto({
    quality: 88,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera
  });

  if (!photo.webPath) {
    throw new Error('没有拿到照片路径');
  }

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  return new File([blob], `camera-${Date.now()}.jpg`, {
    type: blob.type || 'image/jpeg'
  });
};
