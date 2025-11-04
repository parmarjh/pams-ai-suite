
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import SizingModuleComponent from './SizingModule';
import CameraMeasurement from './CameraMeasurement';
import ResultsDisplay from './ResultsDisplay';
import Tabs, { Tab } from './Tabs';
import Spinner from './Spinner';
import { SizingModule, MaleMeasurements, FemaleMeasurements, MaleResults, FemaleResults, FemaleSizingHistoryItem } from '../types';
import { blobToBase64 } from '../utils/helpers';
import { useError } from '../contexts/ErrorContext';

const SizingTool: React.FC = () => {
    const [activeModule, setActiveModule] = useState<SizingModule>(SizingModule.Male);
    const [measurements, setMeasurements] = useState<MaleMeasurements | FemaleMeasurements>({ length: 0, girth: 0 });
    const [results, setResults] = useState<MaleResults | FemaleResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const { setError } = useError();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [femaleSizingHistory, setFemaleSizingHistory] = useState<FemaleSizingHistoryItem[]>([]);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('femaleSizingHistory');
            if (storedHistory) {
                setFemaleSizingHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load sizing history from localStorage", error);
        }
    }, []);

    const moduleTabs: Tab[] = [
        { id: SizingModule.Male, label: 'Male Sizing' },
        { id: SizingModule.Female, label: 'Female Sizing' }
    ];

    const handleModuleChange = (moduleId: string) => {
        const newModule = moduleId as SizingModule;
        setActiveModule(newModule);
        // Reset state when switching modules
        setMeasurements(newModule === SizingModule.Male ? { length: 0, girth: 0 } : { underbust: 0, bust: 0 });
        setResults(null);
        setError(null);
        setImageFile(null);
        setImagePreviewUrl(null);
    };

    const handleCameraComplete = (file: File) => {
        setImageFile(file);
        // Clear manual measurements if an image is uploaded
        setMeasurements(activeModule === SizingModule.Male ? { length: 0, girth: 0 } : { underbust: 0, bust: 0 });
        setResults(null);
    };
    
    const handleHistorySelect = (item: FemaleSizingHistoryItem) => {
        if (activeModule === SizingModule.Female) {
            setMeasurements(item.measurements);
            setResults(item.results);
            setImageFile(null);
            setImagePreviewUrl(null);
            setError(null);
            // Scroll to results
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    };

    const handleClearHistory = () => {
        setFemaleSizingHistory([]);
        localStorage.removeItem('femaleSizingHistory');
    };

    const MALE_SCHEMA = {
        type: Type.OBJECT,
        properties: {
            nominalWidth: { type: Type.NUMBER, description: "Recommended condom nominal width in millimeters." },
            fitConfidence: { type: Type.STRING, description: "A confidence rating for the fit, e.g., 'Excellent', 'Good', 'Snug'." },
            fitAnalysis: {
                type: Type.OBJECT,
                description: "A detailed analysis of the fit based on the provided measurements.",
                properties: {
                    overallFit: { type: Type.STRING, description: "A summary of the overall fit." },
                    lengthConsiderations: { type: Type.STRING, description: "Specific notes about how the length affects the fit." },
                    girthConsiderations: { type: Type.STRING, description: "Specific notes about how the girth affects the fit." }
                },
                required: ['overallFit']
            },
            sizingNotes: { type: Type.STRING, description: "Additional context or notes about the sizing, explaining the 'why' behind the recommendation." },
            adjustments: {
                type: Type.OBJECT,
                description: "Suggestions for adjustments if the recommended size doesn't feel right.",
                properties: {
                    tooTight: { type: Type.STRING, description: "Recommendation if the condom feels too tight." },
                    tooLoose: { type: Type.STRING, description: "Recommendation if the condom feels too loose." },
                    breakage: { type: Type.STRING, description: "Advice if the user experiences condom breakage." },
                    slippingOff: { type: Type.STRING, description: "Advice if the user experiences the condom slipping off." },
                }
            }
        },
        required: ['nominalWidth', 'fitConfidence'],
    };

    const FEMALE_SCHEMA = {
        type: Type.OBJECT,
        properties: {
            bandSize: { type: Type.NUMBER, description: "The calculated band size, e.g., 34, 36." },
            cupSize: { type: Type.STRING, description: "The calculated cup size, e.g., 'C', 'DD'." },
            braSize: { type: Type.STRING, description: "The full bra size, e.g., '34C'." },
            sisterSizes: {
                type: Type.OBJECT,
                description: "Recommended sister sizes for a better fit. Return null for fields if a size cannot be determined.",
                properties: {
                    up: { type: Type.STRING, description: "The sister size with a larger band and smaller cup, in a format like '36B'. Return null if not applicable." },
                    down: { type: Type.STRING, description: "The sister size with a smaller band and larger cup, in a format like '32D'. Return null if not applicable." }
                }
            },
            fitAnalysis: {
                type: Type.OBJECT,
                description: "A detailed analysis of the bra fit, including band and cup assessment.",
                properties: {
                    bandFit: { type: Type.STRING, description: "Feedback on the band fit." },
                    cupFit: { type: Type.STRING, description: "Feedback on the cup fit." },
                    goreTack: { type: Type.STRING, description: "Feedback on whether the center gore (front panel) is tacking (lying flat against the sternum)." },
                    commonIssues: { 
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of common fit issues to watch for with this size and shape."
                    }
                }
            },
            adjustmentTips: {
                type: Type.OBJECT,
                description: "Specific, actionable tips for common fit problems and edge cases.",
                properties: {
                    bandTooTight: { type: Type.STRING, description: "Advice for when the bra band feels too tight." },
                    bandTooLoose: { type: Type.STRING, description: "Advice for when the bra band feels too loose." },
                    cupsTooSmall: { type: Type.STRING, description: "Advice for when the cups are too small (e.g., spillage)." },
                    cupsTooLarge: { type: Type.STRING, description: "Advice for when the cups are too large (e.g., gaping)." },
                    strapsSlipping: { type: Type.STRING, description: "Advice for when the bra straps are slipping off the shoulders." },
                    bandRidingUp: { type: Type.STRING, description: "Advice for when the bra band rides up the back." },
                    underwireDigging: { type: Type.STRING, description: "Advice for when the underwire is digging into the ribs or breast tissue." },
                    styleRecommendations: { type: Type.STRING, description: "Recommendations for bra styles (e.g., plunge, balcony) that might suit the user's shape better." },
                }
            }
        },
        required: ['bandSize', 'cupSize', 'braSize'],
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);
        setLoadingMessage(imageFile ? 'Analyzing image and calculating your size...' : 'Calculating your size...');


        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let prompt = '';
            let schema;
            
            if (activeModule === SizingModule.Male) {
                prompt = `Calculate the recommended condom nominal width based on these measurements: Length - ${(measurements as MaleMeasurements).length} mm, Girth - ${(measurements as MaleMeasurements).girth} mm. Provide a fit confidence score, a detailed fit analysis (including overall fit, length, and girth considerations), specific sizing notes, and suggestions for adjustments for common issues like being too tight, too loose, breakage, or slipping off.`;
                schema = MALE_SCHEMA;
            } else {
                prompt = `Calculate the bra size based on these measurements: Underbust - ${(measurements as FemaleMeasurements).underbust} cm, Bust - ${(measurements as FemaleMeasurements).bust} cm. Provide band size, cup size, full bra size, and sister sizes. It is critical that if sister sizes cannot be accurately determined, the 'up' and 'down' fields in the 'sisterSizes' object MUST be \`null\`, not a string explaining why. Also provide a detailed fit analysis (including band fit, cup fit, gore tack, and common issues). Finally, provide a structured set of adjustment tips for common problems like the band being too tight/loose, cups being too small/large, slipping straps, the band riding up, underwire digging in, and style recommendations.`;
                schema = FEMALE_SCHEMA;
            }

            const contents: any[] = [{ text: prompt }];
            
            if (imageFile) {
                const base64Data = await blobToBase64(imageFile);
                contents.unshift({ inlineData: { data: base64Data, mimeType: imageFile.type } });
                prompt = "Analyze the provided image to determine the measurements and then " + prompt.toLowerCase();
                contents[1].text = prompt; // update prompt
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: contents },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                },
            });
            
            const jsonString = response.text.trim();
            const parsedResult = JSON.parse(jsonString);
            setResults(parsedResult);
            
            if (activeModule === SizingModule.Female) {
                const newHistoryItem: FemaleSizingHistoryItem = {
                    id: new Date().toISOString(),
                    measurements: measurements as FemaleMeasurements,
                    results: parsedResult as FemaleResults,
                    timestamp: Date.now()
                };
                
                const updatedHistory = [newHistoryItem, ...femaleSizingHistory.filter(item => item.results.braSize !== newHistoryItem.results.braSize)].slice(0, 5);
                
                setFemaleSizingHistory(updatedHistory);
                localStorage.setItem('femaleSizingHistory', JSON.stringify(updatedHistory));
            }

        } catch (e: any) {
            setError(`Failed to calculate size. Please check your inputs or image and try again. Details: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderHistory = () => {
        if (activeModule !== SizingModule.Female || femaleSizingHistory.length === 0) {
            return null;
        }

        return (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg animate-fade-in">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Calculation History</h3>
                    <button
                        onClick={handleClearHistory}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        aria-label="Clear all sizing history"
                    >
                        Clear History
                    </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-2">
                    {femaleSizingHistory.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleHistorySelect(item)}
                            className="w-full text-left p-3 bg-white rounded-md shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {item.results.braSize}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Underbust: {item.measurements.underbust}cm, Bust: {item.measurements.bust}cm
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Precision Sizing Tool</h2>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-2xl mx-auto">
                Select a module and enter your measurements manually or use our camera-assisted tool for a recommendation powered by Gemini.
            </p>
            
            <Tabs tabs={moduleTabs} activeTab={activeModule} setActiveTab={handleModuleChange} />

            <div className="bg-gray-50 p-4 rounded-b-lg">
                <SizingModuleComponent
                    module={activeModule}
                    measurements={measurements}
                    setMeasurements={setMeasurements}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                />
                
                <CameraMeasurement 
                    onComplete={handleCameraComplete}
                    imagePreviewUrl={imagePreviewUrl}
                    setImagePreviewUrl={setImagePreviewUrl}
                />
            </div>

            {renderHistory()}

            {isLoading && (
                <div className="mt-8 flex justify-center items-center">
                    <Spinner large />
                    <p className="ml-4 text-gray-600">{loadingMessage}</p>
                </div>
            )}
            
            {results && !isLoading && (
                <ResultsDisplay
                    module={activeModule}
                    results={results}
                    measurements={measurements}
                    imagePreviewUrl={imagePreviewUrl}
                />
            )}
        </div>
    );
};

export default SizingTool;
