export function getPixelData(imageUrl) {
  const img = new Image();
  img.src = '';

  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const canvasCxt = canvas.getContext('2d');
      canvasCxt.drawImage(img, 0, 0);
      resolve({
        width: img.width,
        height: img.height,
        imageData: canvasCxt.getImageData(0, 0, img.width, img.height).data,
      });
    };

    img.src = imageUrl;
  });
}
