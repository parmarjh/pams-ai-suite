import { GoogleGenAI, Modality } from '@google/genai';
import React, { useState } from 'react';
import Tabs, { Tab } from './Tabs';
import { UploadIcon, ArrowDownTrayIcon, XCircleIcon } from './IconComponents';
import Spinner from './Spinner';
import { blobToBase64 } from '../utils/helpers';
import { useError } from '../contexts/ErrorContext';

const ImageStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [generateMode, setGenerateMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { setError } = useError();
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);


  const tabs: Tab[] = [
    { id: 'generate', label: 'Generate' },
    { id: 'edit', label: 'Edit' },
    { id: 'analyze', label: 'Analyze' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setGeneratedImage(null);
      setAnalysisResult('');
    }
  };
  
  const reset = () => {
    setPrompt('');
    setImageFile(null);
    setImagePreview(null);
    setGeneratedImage(null);
    setAnalysisResult('');
    setIsLoading(false);
    setError(null);
    setGenerateMode('text');
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
  }

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    const mimeType = generatedImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*/);
    const extension = mimeType && mimeType.length > 1 ? mimeType[1].split('/')[1] : 'png';
    link.download = `pams-ai-generated-image.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setAnalysisResult('');
    let currentLoadingMessage = '';

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (activeTab === 'generate') {
         if (generateMode === 'image') {
            currentLoadingMessage = 'Generating from your base image...';
            setLoadingMessage(currentLoadingMessage);
            if (!prompt || !imageFile) {
                setError("Please upload an image and enter a prompt for image-to-image generation.");
                setIsLoading(false); return;
            }
            const base64Data = await blobToBase64(imageFile);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ inlineData: { data: base64Data, mimeType: imageFile.type } }, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                setGeneratedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            } else { setError("Could not generate an image from the provided input."); }
        } else { // text-to-image
            currentLoadingMessage = 'Generating your image...';
            setLoadingMessage(currentLoadingMessage);
            if (!prompt) { setError("Please enter a prompt for text-to-image generation."); setIsLoading(false); return; }
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: aspectRatio as any },
            });
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            setGeneratedImage(`data:image/jpeg;base64,${base64ImageBytes}`);
        }
      } else if (activeTab === 'edit') {
        currentLoadingMessage = 'Editing your image...';
        setLoadingMessage(currentLoadingMessage);
        if (!imageFile) { setError("Please upload an image to edit."); setIsLoading(false); return; }

        let finalPrompt = prompt;
        const adjustments: string[] = [];
        if (brightness > 0) adjustments.push(`increase brightness by about ${brightness}%`);
        if (brightness < 0) adjustments.push(`decrease brightness by about ${-brightness}%`);
        if (contrast > 0) adjustments.push(`increase contrast by about ${contrast}%`);
        if (contrast < 0) adjustments.push(`decrease contrast by about ${-contrast}%`);
        if (saturation > 0) adjustments.push(`increase color saturation by about ${saturation}%`);
        if (saturation < 0) adjustments.push(`decrease color saturation by about ${-saturation}% (making it more grayscale)`);
  
        if (adjustments.length > 0) {
          const adjustmentText = adjustments.join(', and ');
          if (finalPrompt.trim()) {
              finalPrompt = `${finalPrompt}. In addition, please apply the following adjustments: ${adjustmentText}.`;
          } else {
              finalPrompt = `Apply the following adjustments to the image: ${adjustmentText}.`;
          }
        }
        
        if (!finalPrompt.trim()) {
            setError("Please enter a text prompt or make an adjustment using the sliders.");
            setIsLoading(false);
            return;
        }

        const base64Data = await blobToBase64(imageFile);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { data: base64Data, mimeType: imageFile.type } }, { text: finalPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) setGeneratedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);

      } else if (activeTab === 'analyze') {
        currentLoadingMessage = 'Analyzing your image...';
        setLoadingMessage(currentLoadingMessage);
        if (!prompt || !imageFile) { setError("Please upload an image and enter a prompt."); setIsLoading(false); return; }
        const base64Data = await blobToBase64(imageFile);
        const imagePart = { inlineData: { data: base64Data, mimeType: imageFile.type } };
        const textPart = { text: prompt };
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });
        setAnalysisResult(response.text);
      }
    } catch (e: any) {
      setError(`Image processing failed. Please try again. Details: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    reset();
  };

  const renderContent = () => {
    if (activeTab === 'analyze') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start p-4">
          {/* Left Column: Image Upload & Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">1. Upload Image</label>
            <div className="mt-1 p-2 border-2 border-gray-300 border-dashed rounded-md flex items-center justify-center min-h-[40vh]">
              {!imagePreview && (
                <div className="space-y-1 text-center">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>{imageFile ? 'Change file' : 'Upload a file'}</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">{imageFile ? imageFile.name : 'PNG, JPG up to 10MB'}</p>
                </div>
              )}
              {imagePreview && (
                <div className="relative group">
                    <img src={imagePreview} alt="Analysis Preview" className="mx-auto max-h-[50vh] rounded-md object-contain" />
                    <button
                        onClick={handleClearImage}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Clear image"
                    >
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                </div>
              )}
            </div>
          </div>
  
          {/* Right Column: Prompt, Action & Result */}
          <div>
            <div className="mb-4">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">2. Ask a question about the image</label>
              <textarea
                id="prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., What objects are in this picture?"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
  
            <button
              onClick={handleSubmit}
              disabled={isLoading || !imageFile}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? <Spinner /> : 'Analyze Image'}
            </button>
  
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Result</h3>
              <div className="bg-gray-50 rounded-lg min-h-[20vh] p-4 text-gray-700 whitespace-pre-wrap relative overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex flex-col items-center justify-center">
                        <Spinner large />
                        <p className="mt-2 text-sm text-gray-500">{loadingMessage}</p>
                    </div>
                )}
                {!isLoading && !analysisResult && <p className="text-gray-500">The AI's analysis will appear here.</p>}
                {!isLoading && analysisResult && <p className="animate-fade-in-scale">{analysisResult}</p>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const showImageUpload = (activeTab === 'generate' && generateMode === 'image') || activeTab === 'edit';
    let placeholder: string;
    switch (activeTab) {
        case 'generate':
            placeholder = generateMode === 'image' 
                ? 'Describe how to transform the image... e.g., "Make this photo look like a watercolor painting."'
                : 'Describe the image you want to create... e.g., "A cinematic photo of a robot holding a red skateboard."';
            break;
        case 'edit':
            placeholder = 'Describe your edit... e.g., "Add a retro filter" or "Remove the person in the background." Or just use the sliders below.';
            break;
        default:
            placeholder = 'Enter your prompt here...';
    }

    const aspectRatios = [
        { value: '1:1', label: 'Square' }, { value: '16:9', label: 'Landscape' },
        { value: '9:16', label: 'Portrait' }, { value: '4:3', label: 'Standard' }, { value: '3:4', label: 'Vertical' },
    ];

    return (
        <div>
        {activeTab === 'generate' && (
             <div className="flex border-b border-gray-200 px-4 pt-4 bg-gray-50 rounded-t-lg">
                <button onClick={() => { if (generateMode !== 'text') { handleClearImage(); setGenerateMode('text'); } }} className={`px-4 py-2 text-sm font-medium focus:outline-none transition-colors duration-200 ${generateMode === 'text' ? 'border-b-2 border-blue-600 text-blue-600' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Text-to-Image
                </button>
                <button onClick={() => { if (generateMode !== 'image') { handleClearImage(); setGenerateMode('image'); } }} className={`ml-4 px-4 py-2 text-sm font-medium focus:outline-none transition-colors duration-200 ${generateMode === 'image' ? 'border-b-2 border-blue-600 text-blue-600' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Image-to-Image
                </button>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start p-4">
            {/* Left Column: Controls */}
            <div>
            {showImageUpload && (
                <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">1. Upload Image</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                    {imagePreview ? (
                        <div className="relative group">
                            <img src={imagePreview} alt="Preview" className="mx-auto max-h-40 rounded-md" />
                            <button onClick={handleClearImage} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Clear image">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : ( <UploadIcon className="mx-auto h-12 w-12 text-gray-400" /> )}
                    <div className="flex text-sm text-gray-600 justify-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>{imageFile ? 'Change file' : 'Upload a file'}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                        </label>
                    </div>
                    <p className="text-xs text-gray-500">{imageFile ? imageFile.name : 'PNG, JPG up to 10MB'}</p>
                    </div>
                </div>
                </div>
            )}
            
            <div className="mb-4">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">{showImageUpload ? '2. ' : '1. '}Enter Prompt</label>
                <textarea id="prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={placeholder} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>

            {activeTab === 'edit' && (
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50 mb-4">
                    <h4 className="text-sm font-medium text-gray-800">Adjustments</h4>
                    <div>
                        <div className="flex justify-between items-center text-sm font-medium text-gray-600 mb-1">
                            <label htmlFor="brightness">Brightness</label>
                            <span className="font-mono bg-white px-2 py-0.5 rounded text-xs">{brightness}</span>
                        </div>
                        <input id="brightness" type="range" min="-50" max="50" value={brightness} onChange={e => setBrightness(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center text-sm font-medium text-gray-600 mb-1">
                            <label htmlFor="contrast">Contrast</label>
                            <span className="font-mono bg-white px-2 py-0.5 rounded text-xs">{contrast}</span>
                        </div>
                        <input id="contrast" type="range" min="-50" max="50" value={contrast} onChange={e => setContrast(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center text-sm font-medium text-gray-600 mb-1">
                            <label htmlFor="saturation">Saturation</label>
                            <span className="font-mono bg-white px-2 py-0.5 rounded text-xs">{saturation}</span>
                        </div>
                        <input id="saturation" type="range" min="-50" max="50" value={saturation} onChange={e => setSaturation(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>
            )}
            
            {activeTab === 'generate' && generateMode === 'text' && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">2. Aspect Ratio</label>
                    <div className="flex flex-wrap items-center justify-start gap-3">
                        {aspectRatios.map(ratio => {
                            const isActive = aspectRatio === ratio.value; let shapeClasses = '';
                            switch (ratio.value) { case '1:1': shapeClasses = 'w-10 h-10'; break; case '16:9': shapeClasses = 'w-16 h-9'; break; case '9:16': shapeClasses = 'w-9 h-16'; break; case '4:3': shapeClasses = 'w-12 h-9'; break; case '3:4': shapeClasses = 'w-9 h-12'; break; }
                            return (
                                <button key={ratio.value} type="button" onClick={() => setAspectRatio(ratio.value)} className={`p-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex flex-col items-center gap-1 ${isActive ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-300 bg-white hover:border-gray-400'}`} aria-pressed={isActive} aria-label={`Set aspect ratio to ${ratio.label} ${ratio.value}`}>
                                    <div className={`${shapeClasses} bg-gray-300 rounded-sm transition-colors ${isActive ? 'bg-blue-300' : ''}`}></div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>{ratio.label}</span>
                                    <span className={`text-xs font-mono ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>{ratio.value}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            <button onClick={handleSubmit} disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
                {isLoading ? <Spinner /> : 'Submit'}
            </button>
            </div>

            {/* Right Column: Output */}
            <div className="bg-gray-50 rounded-lg min-h-[40vh] flex flex-col items-center justify-center p-4">
                {isLoading && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 animate-pulse rounded-lg p-4">
                        <Spinner large />
                        <p className="text-gray-600 mt-4 text-center">{loadingMessage}</p>
                    </div>
                )}
                {!isLoading && generatedImage && (
                    <div className="relative animate-fade-in-scale">
                        <img src={generatedImage} alt="Generated result" className="max-h-[60vh] max-w-full rounded-md object-contain" />
                        <button onClick={handleDownload} className="absolute top-3 right-3 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-110" aria-label="Download image">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {!isLoading && !generatedImage && !analysisResult && <p className="text-gray-500">Output will appear here</p>}
            </div>
        </div>
        </div>
    );
  };
  
  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={handleTabChange} />
      {renderContent()}
    </div>
  );
};

export default ImageStudio;
