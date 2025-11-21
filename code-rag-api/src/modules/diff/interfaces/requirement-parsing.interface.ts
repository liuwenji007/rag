export interface NewFeature {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ModifiedFeature {
  name: string;
  description: string;
  affectedModules: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ImpactScope {
  modules: string[];
  dependencies: string[];
  riskLevel: 'high' | 'medium' | 'low';
}

export interface RequirementParsingResult {
  newFeatures: NewFeature[];
  modifiedFeatures: ModifiedFeature[];
  impactScope: ImpactScope;
}

