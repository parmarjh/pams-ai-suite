import React, { useState } from 'react';
import { MainModule } from './types';
import Tabs, { Tab } from './components/Tabs';
import SizingTool from './components/SizingTool';
import ChatBot from './components/ChatBot';
import ImageStudio from './components/ImageStudio';
import VideoStudio from './components/VideoStudio';
import AudioStudio from './components/AudioStudio';
import { RulerIcon, ChatBubbleLeftRightIcon, PhotoIcon, VideoCameraIcon, MicrophoneIcon } from './components/IconComponents';
import { ErrorProvider } from './contexts/ErrorContext';
import ErrorToast from './components/ErrorToast';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>(MainModule.Sizing);

    const mainTabs: Tab[] = [
        { id: MainModule.Sizing, label: 'Sizing', icon: <RulerIcon className="w-5 h-5" /> },
        { id: MainModule.Chat, label: 'Chat', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" /> },
        { id: MainModule.Image, label: 'Image', icon: <PhotoIcon className="w-5 h-5" /> },
        { id: MainModule.Video, label: 'Video', icon: <VideoCameraIcon className="w-5 h-5" /> },
        { id: MainModule.Audio, label: 'Audio', icon: <MicrophoneIcon className="w-5 h-5" /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case MainModule.Sizing:
                return <SizingTool />;
            case MainModule.Chat:
                return <ChatBot />;
            case MainModule.Image:
                return <ImageStudio />;
            case MainModule.Video:
                return <VideoStudio />;
            case MainModule.Audio:
                return <AudioStudio />;
            default:
                return <SizingTool />;
        }
    };
    
    return (
        <ErrorProvider>
            <div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-6 lg:p-8">
                <ErrorToast />
                <div className="max-w-6xl mx-auto">
                    <header className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">PAMS & AI Suite</h1>
                        <p className="text-md text-gray-600 mt-2">Precision Sizing and a Full Suite of Gemini-Powered AI Tools.</p>
                    </header>
                    <main>
                        <Tabs tabs={mainTabs} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <div className="bg-white rounded-b-lg shadow-md min-h-[60vh]">
                            {renderContent()}
                        </div>
                    </main>
                    <footer className="text-center mt-12 text-xs text-gray-500">
                        <p>Disclaimer: This tool provides estimations and AI-generated content. For medical purposes, always consult a healthcare professional. Verify important information.</p>
                    </footer>
                </div>
            </div>
        </ErrorProvider>
    );
};

export default App;
