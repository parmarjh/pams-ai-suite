import React, { useState, useRef } from 'react';
import { UploadIcon } from './IconComponents';

interface CameraMeasurementProps {
  onComplete: (file: File) => void;
  imagePreviewUrl: string | null;
  setImagePreviewUrl: (url: string | null) => void;
}

const CameraMeasurement: React.FC<CameraMeasurementProps> = ({ onComplete, imagePreviewUrl, setImagePreviewUrl }) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size exceeds 10MB. Please choose a smaller file.');
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      onComplete(file);
    }
  };
  
  const handleUploadClick = () => {
      fileInputRef.current?.click();
  }

  return (
    <div className="p-4 md:p-6 border-t border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Or, Use Camera-Assisted Sizing
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        For a more accurate result, upload a photo next to a standard-sized object (like a credit card) for scale. We will analyze the image to determine your measurements.
      </p>

      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          {imagePreviewUrl ? (
            <img src={imagePreviewUrl} alt="Preview" className="mx-auto max-h-40 rounded-md" />
          ) : (
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
          )}
          <div className="flex text-sm text-gray-600 justify-center">
            <button type="button" onClick={handleUploadClick} className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
              <span>{imagePreviewUrl ? 'Change image' : 'Upload an image'}</span>
            </button>
            <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
          </div>
          <p className="text-xs text-gray-500">{imagePreviewUrl ? 'Image selected.' : 'PNG, JPG up to 10MB'}</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default CameraMeasurement;
