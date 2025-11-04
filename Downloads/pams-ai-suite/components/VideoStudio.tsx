import { GoogleGenAI } from '@google/genai';
import React, { useState, useEffect } from 'react';
import Tabs, { Tab } from './Tabs';
import { UploadIcon, VideoCameraIcon } from './IconComponents';
import Spinner from './Spinner';
import { blobToBase64 } from '../utils/helpers';
import { useError } from '../contexts/ErrorContext';

const VideoStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('textToVideo');
  // Generation states
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  // Analysis states
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Common states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { setError } = useError();
  const [apiKeySelected, setApiKeySelected] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setApiKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setApiKeySelected(true); // Assume success to avoid race condition
    }
  };

  const tabs: Tab[] = [
    { id: 'textToVideo', label: 'Generate from Text' },
    { id: 'imageToVideo', label: 'Generate from Image' },
    { id: 'analyze', label: 'Analyze Video' },
  ];

  // Handler for generation image upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
    // Handler for analysis video upload
    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          if (file.size > 100 * 1024 * 1024) { // 100MB limit
            setError('File size exceeds 100MB. Please choose a smaller file.');
            return;
          }
          setVideoFile(file);
          const url = URL.createObjectURL(file);
          setVideoPreview(url);
          setAnalysisResult(null); // Clear previous result
        }
      };

  const reset = () => {
    setPrompt('');
    setImageFile(null);
    setImagePreview(null);
    setGeneratedVideo(null);
    setAnalysisPrompt('');
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysisResult(null);
    setIsLoading(false);
    setError(null);
    setLoadingMessage('');
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile || !analysisPrompt) {
        setError('Please upload a video and enter a prompt for analysis.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setLoadingMessage('Analyzing your video... This may take a moment.');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = await blobToBase64(videoFile);
        
        const videoPart = {
            inlineData: {
                mimeType: videoFile.type,
                data: base64Data,
            },
        };
        const textPart = { text: analysisPrompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [videoPart, textPart] },
        });

        setAnalysisResult(response.text);

    } catch (e: any) {
        setError(`Video analysis failed. Please check the file and try again. Details: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!apiKeySelected) {
        setError("Please select an API key to use Veo video generation.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedVideo(null);
    setLoadingMessage('Initializing generation...');
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const generationPayload: any = {
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
        };

        if (activeTab === 'imageToVideo' && imageFile) {
            generationPayload.image = {
                imageBytes: await blobToBase64(imageFile),
                mimeType: imageFile.type,
            }
        } else if (activeTab === 'imageToVideo' && !imageFile) {
             setError('Please upload an image for image-to-video generation.');
             setIsLoading(false);
             return;
        }

        let operation = await ai.models.generateVideos(generationPayload);
        setLoadingMessage('Processing video... This is the longest step, please wait.');

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            setLoadingMessage('Still processing... Checking on your video\'s progress.');
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        setLoadingMessage('Rendering final output...');

        if (operation.response?.generatedVideos?.[0]?.video?.uri) {
            const downloadLink = operation.response.generatedVideos[0].video.uri;
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const videoBlob = await response.blob();
            setGeneratedVideo(URL.createObjectURL(videoBlob));
        } else {
            throw new Error('Video generation finished but no video URI was found.');
        }

    } catch (e: any) {
        let errorMessage = `Video generation failed. Details: ${e.message}`;
        if (e.message?.includes("Requested entity was not found.")) {
            errorMessage = "API key not found or invalid. Please re-select your API key.";
            setApiKeySelected(false);
        }
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };
  
  const isGenerationTab = activeTab === 'textToVideo' || activeTab === 'imageToVideo';

  if (isGenerationTab && !apiKeySelected) {
    return (
        <div className="text-center p-8">
            <h3 className="text-xl font-semibold mb-4">API Key Required for Video Generation</h3>
            <p className="mb-4 text-gray-700">The Veo video generation model requires you to select a personal API key. Billing is associated with your key.</p>
            <p className="mb-6 text-sm text-gray-500">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">billing documentation</a>.</p>
            <button onClick={handleSelectKey} className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
                Select API Key
            </button>
        </div>
    );
  }
  
  const videoAspectRatios = [
    { value: '16:9', label: 'Landscape' },
    { value: '9:16', label: 'Portrait' },
  ];

  const renderAnalysisTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start p-4">
        {/* Left Column: Controls */}
        <div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">1. Upload Video</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        {videoPreview ? (
                            <video src={videoPreview} controls className="mx-auto max-h-60 rounded-md" />
                        ) : <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-400" />}
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label htmlFor="video-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                                <span>{videoFile ? 'Change video' : 'Upload a video'}</span>
                                <input id="video-upload" name="video-upload" type="file" className="sr-only" onChange={handleVideoFileChange} accept="video/*" />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500">{videoFile ? videoFile.name : 'MP4, MOV, etc. up to 100MB'}</p>
                    </div>
                </div>
            </div>
            <div className="mb-4">
                <label htmlFor="analysis-prompt" className="block text-sm font-medium text-gray-700 mb-1">2. Ask a question about the video</label>
                <textarea id="analysis-prompt" rows={4} value={analysisPrompt} onChange={(e) => setAnalysisPrompt(e.target.value)} placeholder="e.g., Provide a summary of this video." className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <button onClick={handleAnalyzeVideo} disabled={isLoading || !videoFile || !analysisPrompt} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
                {isLoading ? <Spinner /> : 'Analyze Video'}
            </button>
        </div>
        {/* Right Column: Output */}
        <div className="bg-gray-50 rounded-lg min-h-[40vh] flex flex-col items-center justify-center p-4">
             {isLoading && (<> <Spinner large /> <p className="text-gray-600 mt-4 text-center">{loadingMessage}</p> </>)}
             {!isLoading && analysisResult && (
                <div className="w-full h-full text-left self-start custom-scroll overflow-y-auto max-h-[60vh]">
                    <p className="whitespace-pre-wrap animate-fade-in-scale">{analysisResult}</p>
                </div>
            )}
            {!isLoading && !analysisResult && <p className="text-gray-500">Analysis will appear here</p>}
        </div>
    </div>
  );

  const renderGenerationTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start p-4">
      <div>
        {activeTab === 'imageToVideo' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">1. Upload Starting Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {imagePreview ? <img src={imagePreview} alt="Preview" className="mx-auto max-h-40 rounded-md" /> : <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />}
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>{imageFile ? 'Change file' : 'Upload a file'}</span>
                    <input id="file-upload" type="file" className="sr-only" onChange={handleImageFileChange} accept="image/*" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">{activeTab === 'imageToVideo' ? '2. ' : '1. '}Enter Prompt</label>
          <textarea id="prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A cinematic shot of..." className="w-full p-2 border border-gray-300 rounded-md" />
        </div>
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{activeTab === 'imageToVideo' ? '3. ' : '2. '}Aspect Ratio</label>
            <div className="flex flex-wrap items-center justify-start gap-3">
                {videoAspectRatios.map(ratio => {
                    const isActive = aspectRatio === ratio.value; 
                    let shapeClasses = '';
                    switch (ratio.value) { 
                        case '16:9': shapeClasses = 'w-16 h-9'; break; 
                        case '9:16': shapeClasses = 'w-9 h-16'; break; 
                    }
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
        <button onClick={handleGenerateVideo} disabled={isLoading || !prompt} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
          {isLoading ? <Spinner /> : 'Generate Video'}
        </button>
      </div>
      <div className="bg-gray-50 rounded-lg min-h-[40vh] flex items-center justify-center p-4 flex-col">
        {isLoading && (<> <Spinner large /> <p className="text-gray-600 mt-4 text-center">{loadingMessage}</p> </>)}
        {!isLoading && generatedVideo && <video src={generatedVideo} controls autoPlay loop className="max-h-[60vh] max-w-full rounded-md" />}
        {!isLoading && !generatedVideo && <p className="text-gray-500">Generated video will appear here</p>}
      </div>
    </div>
  );
  
  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={(id) => {setActiveTab(id); reset();}} />
      {isGenerationTab ? renderGenerationTab() : renderAnalysisTab()}
    </div>
  );
};

export default VideoStudio;