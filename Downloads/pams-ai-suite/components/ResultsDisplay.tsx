
import React from 'react';
import { MaleResults, FemaleResults, SizingModule, MaleMeasurements, FemaleMeasurements } from '../types';

interface ResultsDisplayProps {
  module: SizingModule;
  results: MaleResults | FemaleResults | null;
  measurements: MaleMeasurements | FemaleMeasurements | null;
  imagePreviewUrl: string | null;
}

const MaleSchematic: React.FC<{ measurements: MaleMeasurements }> = ({ measurements }) => {
    const lengthPercentage = Math.min(100, (measurements.length / 250) * 100);
    const girthPercentage = Math.min(100, (measurements.girth / 200) * 40);
  
    return (
      <div className="relative w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center p-4 overflow-hidden">
        <div className="relative" style={{ height: `${lengthPercentage}%`, width: `${girthPercentage}%`}}>
            <div className="w-full h-full bg-blue-300 rounded-full opacity-50"></div>
            {/* Length indicator */}
            <div className="absolute left-full top-0 bottom-0 ml-2 flex items-center">
                <div className="h-full w-px bg-gray-400"></div>
                <div className="text-xs text-gray-600 ml-1 whitespace-nowrap">{measurements.length} mm</div>
            </div>
            {/* Girth indicator */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-2 right-0 flex justify-center items-center">
                 <div className="w-full h-px bg-gray-400 absolute"></div>
                 <div className="bg-gray-100 px-1 relative text-xs text-gray-600">{measurements.girth} mm</div>
            </div>
        </div>
      </div>
    );
  };
  
  const FemaleSchematic: React.FC<{ measurements: FemaleMeasurements }> = ({ measurements }) => {
    const bandScale = Math.min(100, (measurements.underbust / 120) * 100);
    const cupScale = Math.min(100, ((measurements.bust - measurements.underbust) / 25) * 80);
  
    return (
      <div className="relative w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center p-4">
        <div className="relative w-48 h-32">
          {/* Underbust */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-4 bg-blue-300 opacity-50 rounded-t-sm" style={{ width: `${bandScale}%`}}></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-4 text-xs text-gray-600">{measurements.underbust} cm</div>
          {/* Bust */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-between w-full" style={{width: `calc(${bandScale}% + ${cupScale}px)`}}>
            <div className="h-12 w-12 bg-pink-300 opacity-50 rounded-full" style={{transform: `scale(${1 + cupScale/100})`}}></div>
            <div className="h-12 w-12 bg-pink-300 opacity-50 rounded-full" style={{transform: `scale(${1 + cupScale/100})`}}></div>
          </div>
           <div className="absolute top-1/2 -translate-y-1/2 w-full h-px bg-gray-400"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-100 px-1 text-xs text-gray-600">{measurements.bust} cm</div>
        </div>
      </div>
    );
  };
  

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ module, results, measurements, imagePreviewUrl }) => {
  if (!results || !measurements) return null;

  const renderMaleResults = () => {
    const maleResults = results as MaleResults;
    const maleMeasurements = measurements as MaleMeasurements;
    return (
      <>
        <div className="text-center">
          <p className="text-sm text-gray-600">Recommended Condom Nominal Width</p>
          <p className="text-4xl font-bold text-blue-600 my-2">{maleResults.nominalWidth} mm</p>
          <p className="text-sm font-semibold text-gray-700">Fit Confidence: <span className="text-green-600">{maleResults.fitConfidence}</span></p>
        </div>

        {maleResults.fitAnalysis && (
            <div className="mt-4 text-sm text-left bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold text-gray-700">Detailed Fit Analysis</h5>
                <div className="space-y-2 mt-2 text-xs">
                    {maleResults.fitAnalysis.overallFit && <p><strong className="font-medium">Overall Fit:</strong> {maleResults.fitAnalysis.overallFit}</p>}
                    {maleResults.fitAnalysis.lengthConsiderations && <p><strong className="font-medium">Length Considerations:</strong> {maleResults.fitAnalysis.lengthConsiderations}</p>}
                    {maleResults.fitAnalysis.girthConsiderations && <p><strong className="font-medium">Girth Considerations:</strong> {maleResults.fitAnalysis.girthConsiderations}</p>}
                </div>
            </div>
        )}

        {maleResults.sizingNotes && (
            <div className="mt-4 text-sm text-left bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold text-gray-700">Sizing Notes</h5>
                <p className="text-gray-600 mt-1">{maleResults.sizingNotes}</p>
            </div>
        )}
        
        {maleResults.adjustments && (maleResults.adjustments.tooTight || maleResults.adjustments.tooLoose || maleResults.adjustments.breakage || maleResults.adjustments.slippingOff) && (
            <div className="mt-4 text-sm text-left bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold text-gray-700">Common Issues & Adjustments</h5>
                <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                    {maleResults.adjustments.tooTight && (
                        <li><strong>Feels too tight?</strong> {maleResults.adjustments.tooTight}</li>
                    )}
                    {maleResults.adjustments.tooLoose && (
                        <li><strong>Feels too loose?</strong> {maleResults.adjustments.tooLoose}</li>
                    )}
                    {maleResults.adjustments.breakage && (
                        <li><strong>Experiencing breakage?</strong> {maleResults.adjustments.breakage}</li>
                    )}
                    {maleResults.adjustments.slippingOff && (
                        <li><strong>Slipping off?</strong> {maleResults.adjustments.slippingOff}</li>
                    )}
                </ul>
            </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold text-gray-800 mb-2">Raw Data</h4>
          <p className="text-sm text-gray-600">Erect Length: {maleMeasurements.length} mm</p>
          <p className="text-sm text-gray-600">Max Girth: {maleMeasurements.girth} mm</p>
        </div>
      </>
    );
  };

  const renderFemaleResults = () => {
    const femaleResults = results as FemaleResults;
    const femaleMeasurements = measurements as FemaleMeasurements;
    const adjustmentTipsConfig = [
        { key: 'bandTooTight', label: 'Band feels tight?' },
        { key: 'bandTooLoose', label: 'Band feels loose?' },
        { key: 'cupsTooSmall', label: 'Cups feel small (spillage)?' },
        { key: 'cupsTooLarge', label: 'Cups feel large (gaping)?' },
        { key: 'strapsSlipping', label: 'Straps slipping?' },
        { key: 'bandRidingUp', label: 'Band riding up?' },
        { key: 'underwireDigging', label: 'Underwire digging in?' },
        { key: 'styleRecommendations', label: 'Style Note:' },
    ] as const;

    return (
      <>
        <div className="text-center">
          <p className="text-sm text-gray-600">Recommended Bra Size</p>
          <p className="text-4xl font-bold text-blue-600 my-2">{femaleResults.braSize}</p>
          <p className="text-sm font-semibold text-gray-700">Band: {femaleResults.bandSize}, Cup: {femaleResults.cupSize}</p>
        </div>
        
        {femaleResults.sisterSizes && (femaleResults.sisterSizes.up || femaleResults.sisterSizes.down) && (
            <div className="mt-4 text-sm text-left bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold text-gray-700">Find a Better Fit: Sister Sizes</h5>
                <p className="text-xs text-gray-600 mt-1 mb-2">
                    "Sister sizes" have the same cup volume. If your band feels too tight or loose, try one of these:
                </p>
                <ul className="list-disc list-inside text-xs space-y-1">
                    {femaleResults.sisterSizes.down && (
                        <li><strong>Smaller Band, Larger Cup:</strong> Try a <span className="font-mono bg-gray-200 px-1 rounded">{femaleResults.sisterSizes.down}</span> if the band feels loose.</li>
                    )}
                    {femaleResults.sisterSizes.up && (
                        <li><strong>Larger Band, Smaller Cup:</strong> Try a <span className="font-mono bg-gray-200 px-1 rounded">{femaleResults.sisterSizes.up}</span> if the band feels tight.</li>
                    )}
                </ul>
            </div>
        )}

        {femaleResults.fitAnalysis && (
            <div className="mt-4 text-sm text-left bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold text-gray-700">Detailed Fit Analysis</h5>
                <div className="space-y-2 mt-2 text-xs">
                    {femaleResults.fitAnalysis.bandFit && <p><strong className="font-medium">Band:</strong> {femaleResults.fitAnalysis.bandFit}</p>}
                    {femaleResults.fitAnalysis.cupFit && <p><strong className="font-medium">Cups:</strong> {femaleResults.fitAnalysis.cupFit}</p>}
                    {femaleResults.fitAnalysis.goreTack && <p><strong className="font-medium">Center Gore:</strong> {femaleResults.fitAnalysis.goreTack}</p>}
                    {femaleResults.fitAnalysis.commonIssues && femaleResults.fitAnalysis.commonIssues.length > 0 && (
                        <div>
                            <strong className="font-medium">Things to check:</strong>
                            <ul className="list-disc list-inside pl-2">
                                {femaleResults.fitAnalysis.commonIssues.map((issue, index) => <li key={index}>{issue}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        )}

        {femaleResults.adjustmentTips && (
            <div className="mt-4 text-sm text-left bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold text-gray-700">Adjustment Tips</h5>
                <ul className="list-disc list-inside text-xs space-y-2 mt-2">
                    {adjustmentTipsConfig.map(tip => {
                        const tipText = femaleResults.adjustmentTips?.[tip.key];
                        if (tipText) {
                            return (
                                <li key={tip.key}>
                                    <strong>{tip.label}</strong> {tipText}
                                </li>
                            );
                        }
                        return null;
                    })}
                </ul>
            </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold text-gray-800 mb-2">Raw Data</h4>
          <p className="text-sm text-gray-600">Underbust Girth: {femaleMeasurements.underbust} cm</p>
          <p className="text-sm text-gray-600">Bust Girth: {femaleMeasurements.bust} cm</p>
          <p className="text-sm text-gray-600">Breast Projection Index (Cup): {femaleResults.cupSize}</p>
        </div>
      </>
    );
  };

  return (
    <div className="mt-8 animate-fade-in">
      <h3 className="text-2xl font-bold text-center text-gray-800 mb-4">Your Sizing Report</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h4 className="font-semibold text-gray-800 text-lg mb-4">Mapped Sizing</h4>
          {module === SizingModule.Male ? renderMaleResults() : renderFemaleResults()}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h4 className="font-semibold text-gray-800 text-lg mb-4">Visualization</h4>
          {imagePreviewUrl ? (
            <div className="relative">
                <img src={imagePreviewUrl} alt="Visualization" className="rounded-lg max-h-64 w-full object-contain" />
                <p className="text-xs text-gray-500 mt-2 text-center">User-uploaded image with measurements as a reference.</p>
            </div>
          ) : (
            <>
            {module === SizingModule.Male ? <MaleSchematic measurements={measurements as MaleMeasurements} /> : <FemaleSchematic measurements={measurements as FemaleMeasurements}/>}
            <p className="text-xs text-gray-500 mt-2 text-center">Generic schematic based on your measurements.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
