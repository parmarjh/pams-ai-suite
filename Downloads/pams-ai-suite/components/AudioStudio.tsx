
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAI } from '@google/genai';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Tabs, { Tab } from './Tabs';
import { MicrophoneIcon, StopCircleIcon } from './IconComponents';
import Spinner from './Spinner';
import { decode, decodeAudioData, encode } from '../utils/helpers';
import { useError } from '../contexts/ErrorContext';

const AudioStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('live');

  const tabs: Tab[] = [
    { id: 'live', label: 'Live Conversation' },
    { id: 'transcribe', label: 'Transcribe Audio' },
  ];

  return (
    <div>
      <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="p-4">
        {activeTab === 'live' ? <LiveConversation /> : <TranscribeAudio />}
      </div>
    </div>
  );
};


const LiveConversation: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const { setError } = useError();
    const [userTranscript, setUserTranscript] = useState('');
    const [modelTranscript, setModelTranscript] = useState('');
    const [history, setHistory] = useState<{user:string, model:string}[]>([]);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const stopConversation = useCallback(async () => {
        setIsActive(false);
        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if(inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if(outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }, []);

    const startConversation = async () => {
        setIsConnecting(true);
        setError(null);
        setHistory([]);
        setUserTranscript('');
        setModelTranscript('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsActive(true);
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenAI = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                         if (message.serverContent?.inputTranscription) {
                            setUserTranscript(prev => prev + message.serverContent.inputTranscription.text);
                         }
                         if (message.serverContent?.outputTranscription) {
                            setModelTranscript(prev => prev + message.serverContent.outputTranscription.text);
                         }
                         if (message.serverContent?.turnComplete) {
                            setHistory(prev => [...prev, {user: userTranscript, model: modelTranscript}]);
                            setUserTranscript('');
                            setModelTranscript('');
                         }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            const outCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                            const source = outCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outCtx.destination);
                            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError(`Connection error: ${e.message}`);
                        stopConversation();
                    },
                    onclose: (e: CloseEvent) => {
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                }
            });

        } catch (e: any) {
            setError(`Live conversation failed to start or encountered an error. Details: ${e.message}`);
            setIsConnecting(false);
        }
    };
    
    return (
        <div className="text-center">
            {!isActive && !isConnecting && (
                <button onClick={startConversation} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-full inline-flex items-center gap-2 hover:bg-blue-700">
                    <MicrophoneIcon className="w-6 h-6" /> Start Conversation
                </button>
            )}
             {isConnecting && <div className="flex items-center justify-center gap-2"><Spinner/> Connecting...</div>}
            {isActive && (
                <button onClick={stopConversation} className="bg-red-600 text-white font-bold py-3 px-6 rounded-full inline-flex items-center gap-2 hover:bg-red-700">
                    <StopCircleIcon className="w-6 h-6" /> Stop Conversation
                </button>
            )}

            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg min-h-[40vh]">
                <h3 className="font-semibold mb-2">Conversation</h3>
                {history.map((turn, index) => (
                    <div key={index}>
                        <p><strong className="text-blue-600">You:</strong> {turn.user}</p>
                        <p><strong className="text-green-600">Model:</strong> {turn.model}</p>
                    </div>
                ))}
                {isActive && (
                    <div>
                         <p><strong className="text-blue-600">You:</strong> {userTranscript}</p>
                        <p><strong className="text-green-600">Model:</strong> {modelTranscript}</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const TranscribeAudio: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [transcription, setTranscription] = useState('');
    const { setError } = useError();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        setError(null);
        setTranscription('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = handleTranscription;
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (e: any) {
            setError(`Could not start recording: ${e.message}`);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            // Stop mic access
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsLoading(true);
            setLoadingMessage('Transcribing your audio...');
        }
    };

    const handleTranscription = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const audioBytes = await audioBlob.arrayBuffer();
            const base64Audio = encode(new Uint8Array(audioBytes));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { parts: [ { inlineData: { mimeType: audioBlob.type, data: base64Audio } }, {text: "Transcribe this audio."} ] }
                ]
            });
            setTranscription(response.text);

        } catch(e:any) {
             setError(`Transcription failed. Please try recording again. Details: ${e.message}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="text-center">
            {!isRecording ? (
                 <button onClick={handleStartRecording} disabled={isLoading} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-full inline-flex items-center gap-2 hover:bg-blue-700 disabled:bg-blue-300">
                    <MicrophoneIcon className="w-6 h-6" /> Start Recording
                </button>
            ) : (
                 <button onClick={handleStopRecording} className="bg-red-600 text-white font-bold py-3 px-6 rounded-full inline-flex items-center gap-2 hover:bg-red-700">
                    <StopCircleIcon className="w-6 h-6" /> Stop Recording
                </button>
            )}
            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg min-h-[20vh] flex flex-col items-center justify-center">
                {isLoading && (
                    <>
                        <Spinner large />
                        <p className="mt-4 text-gray-500">{loadingMessage}</p>
                    </>
                )}
                {!isLoading && transcription && <p className="whitespace-pre-wrap">{transcription}</p>}
                {!isLoading && !transcription && <p className="text-gray-500">Your transcription will appear here.</p>}
            </div>
        </div>
    );
}

export default AudioStudio;
