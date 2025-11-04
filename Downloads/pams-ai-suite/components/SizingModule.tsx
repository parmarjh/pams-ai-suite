import React from 'react';
import { SizingModule as SizingModuleEnum, MaleMeasurements, FemaleMeasurements } from '../types';

interface SizingModuleProps {
  module: SizingModuleEnum;
  measurements: MaleMeasurements | FemaleMeasurements;
  setMeasurements: (measurements: MaleMeasurements | FemaleMeasurements) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const SizingModule: React.FC<SizingModuleProps> = ({ module, measurements, setMeasurements, onSubmit, isLoading }) => {
  
  const handleMaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeasurements({
      ...measurements,
      [e.target.name]: e.target.value === '' ? 0 : parseFloat(e.target.value)
    } as MaleMeasurements);
  };

  const handleFemaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeasurements({
      ...measurements,
      [e.target.name]: e.target.value === '' ? 0 : parseFloat(e.target.value)
    } as FemaleMeasurements);
  };
  
  const renderMaleForm = () => {
    const maleMeasurements = measurements as MaleMeasurements;
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="length" className="block text-sm font-medium text-gray-700">Erect Length (mm)</label>
          <input
            type="number"
            name="length"
            id="length"
            value={maleMeasurements.length || ''}
            onChange={handleMaleChange}
            placeholder="e.g., 150"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="girth" className="block text-sm font-medium text-gray-700">Maximum Girth (mm)</label>
          <input
            type="number"
            name="girth"
            id="girth"
            value={maleMeasurements.girth || ''}
            onChange={handleMaleChange}
            placeholder="e.g., 120"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
    );
  };
  
  const renderFemaleForm = () => {
    const femaleMeasurements = measurements as FemaleMeasurements;
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="underbust" className="block text-sm font-medium text-gray-700">Underbust Girth (cm)</label>
          <input
            type="number"
            name="underbust"
            id="underbust"
            value={femaleMeasurements.underbust || ''}
            onChange={handleFemaleChange}
            placeholder="e.g., 75"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="bust" className="block text-sm font-medium text-gray-700">Bust Girth (cm)</label>
          <input
            type="number"
            name="bust"
            id="bust"
            value={femaleMeasurements.bust || ''}
            onChange={handleFemaleChange}
            placeholder="e.g., 90"
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-4 md:p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Enter Measurements for {module === SizingModuleEnum.Male ? 'Male Sizing (Condoms)' : 'Female Sizing (Bras)'}
      </h3>
      
      {module === SizingModuleEnum.Male ? renderMaleForm() : renderFemaleForm()}

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isLoading ? 'Calculating...' : 'Calculate My Size'}
      </button>
    </div>
  );
};

export default SizingModule;
