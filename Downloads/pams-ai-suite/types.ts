
export enum SizingModule {
  Male = 'male',
  Female = 'female',
}

export enum MainModule {
  Sizing = 'sizing',
  Chat = 'chat',
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
}

export interface MaleMeasurements {
  length: number;
  girth: number;
}

export interface FemaleMeasurements {
  underbust: number;
  bust: number;
}

export interface MaleResults {
  nominalWidth: number;
  fitConfidence: string;
  fitAnalysis?: {
    overallFit: string;
    lengthConsiderations?: string;
    girthConsiderations?: string;
  };
  sizingNotes?: string;
  adjustments?: {
    tooTight?: string;
    tooLoose?: string;
    breakage?: string;
    slippingOff?: string;
  };
}

export interface FemaleResults {
  bandSize: number;
  cupSize: string;
  braSize: string;
  sisterSizes?: {
    up: string | null;
    down: string | null;
  };
  fitAnalysis?: {
    bandFit?: string;
    cupFit?: string;
    goreTack?: string;
    commonIssues?: string[];
  };
  adjustmentTips?: {
    bandTooTight?: string;
    bandTooLoose?: string;
    cupsTooSmall?: string;
    cupsTooLarge?: string;
    strapsSlipping?: string;
    bandRidingUp?: string;
    underwireDigging?: string;
    styleRecommendations?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  citations?: {uri: string, title: string}[];
}

export interface FemaleSizingHistoryItem {
  id: string;
  measurements: FemaleMeasurements;
  results: FemaleResults;
  timestamp: number;
}
