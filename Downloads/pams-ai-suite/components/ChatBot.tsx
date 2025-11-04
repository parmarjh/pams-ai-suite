
import { GoogleGenAI } from '@google/genai';
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { PaperAirplaneIcon, BrainCircuitIcon, SearchIcon, MapPinIcon } from './IconComponents';
import Spinner from './Spinner';
import { useError } from '../contexts/ErrorContext';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const { setError } = useError();
  const [model, setModel] = useState('gemini-2.5-flash');
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    
    let currentLoadingMessage = 'Thinking...';
    if (useSearch && useMaps) {
        currentLoadingMessage = 'Searching Google and Maps...';
    } else if (useSearch) {
        currentLoadingMessage = 'Searching Google...';
    } else if (useMaps) {
        currentLoadingMessage = 'Querying Maps...';
    }
    setLoadingMessage(currentLoadingMessage);
    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const tools: any[] = [];
      if (useSearch) tools.push({ googleSearch: {} });
      if (useMaps) tools.push({ googleMaps: {} });
      
      const config: any = {};
      if (tools.length > 0) config.tools = tools;

      if(model === 'gemini-2.5-pro') {
        config.thinkingConfig = { thinkingBudget: 32768 };
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: input,
        config: config,
      });

      const citations: {uri: string, title: string}[] = [];
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web) {
            citations.push({uri: chunk.web.uri, title: chunk.web.title});
          } else if (chunk.maps) {
             citations.push({uri: chunk.maps.uri, title: chunk.maps.title});
          }
        });
      }
      
      const newModelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        citations: citations.length > 0 ? citations : undefined
      };
      setMessages(prev => [...prev, newModelMessage]);

    } catch (e: any) {
      setError(`The model could not be reached. Please check your connection and try again. Details: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] p-4">
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg custom-scroll">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-prose p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.citations && msg.citations.length > 0 && (
                 <div className="mt-2 pt-2 border-t border-gray-300">
                    <h4 className="text-xs font-semibold mb-1">Sources:</h4>
                    <ul className="list-disc list-inside text-xs">
                       {msg.citations.map((citation, index) => (
                          <li key={index}>
                             <a href={citation.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">
                                {citation.title || 'Source'}
                             </a>
                          </li>
                       ))}
                    </ul>
                 </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-prose p-3 rounded-lg bg-gray-200 text-gray-800 flex items-center">
              <Spinner />
              <span className="ml-2">{loadingMessage}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="mt-auto">
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
                 <label htmlFor="model-select">Model:</label>
                 <select id="model-select" value={model} onChange={e => setModel(e.target.value)} className="border border-gray-300 rounded-md p-1">
                     <option value="gemini-2.5-flash">Flash</option>
                     <option value="gemini-2.5-flash-lite">Flash-Lite</option>
                     <option value="gemini-2.5-pro">Pro (Thinking)</option>
                 </select>
                 {model === 'gemini-2.5-pro' && <BrainCircuitIcon className="w-5 h-5 text-purple-600" title="Thinking Mode Enabled" />}
            </div>
            <div className="flex-grow border-t border-gray-300 mx-2"></div>
            <div className="flex items-center gap-2">
                <input type="checkbox" id="useSearch" checked={useSearch} onChange={e => setUseSearch(e.target.checked)} />
                <label htmlFor="useSearch" className="flex items-center gap-1"><SearchIcon className="w-4 h-4" /> Search</label>
            </div>
             <div className="flex items-center gap-2">
                <input type="checkbox" id="useMaps" checked={useMaps} onChange={e => setUseMaps(e.target.checked)} />
                <label htmlFor="useMaps" className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> Maps</label>
            </div>
        </div>
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-r-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center w-14"
          >
            {isLoading ? <Spinner /> : <PaperAirplaneIcon className="w-5 h-5"/>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
