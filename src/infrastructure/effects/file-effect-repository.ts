import { injectable, unmanaged } from 'inversify';
import type { EffectRepository } from '../../domain/effects/effect-repository.js';
import type { Effect } from '../../domain/effects/effect.js';
import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

@injectable()
export class FileEffectRepository implements EffectRepository {
  private effectsCache: Map<string, Effect> = new Map();
  private watchCallbacks: Array<(effects: Effect[]) => void> = [];
  private effectsDirectory: string;

  constructor(@unmanaged() effectsDirectory = './effects') {
    this.effectsDirectory = effectsDirectory;
  }

  async loadEffects(): Promise<Effect[]> {
    try {
      console.log(`🎨 Effects: Loading effects from ${this.effectsDirectory}...`);
      
      const files = await fs.readdir(this.effectsDirectory);
      const effectFiles = files.filter(file => 
        (file.endsWith('.yaml') || file.endsWith('.yml')) && !file.startsWith('.')
      );

      const effects: Effect[] = [];
      this.effectsCache.clear();

      for (const file of effectFiles) {
        try {
          const effectPath = path.join(this.effectsDirectory, file);
          const effectContent = await fs.readFile(effectPath, 'utf8');
          const effectData = yaml.parse(effectContent);
          
          const effect: Effect = this.parseEffect(effectData, path.basename(file, path.extname(file)));
          effects.push(effect);
          this.effectsCache.set(effect.name, effect);
          
        } catch (error) {
          console.warn(`🎨 Effects: Failed to load effect from ${file}:`, error);
        }
      }

      console.log(`🎨 Effects: Loaded ${effects.length} effects`);
      
      // Notify watchers
      this.notifyWatchers(effects);
      
      return effects;
      
    } catch (error) {
      console.error('🎨 Effects: Failed to load effects directory:', error);
      return [];
    }
  }

  async getEffect(name: string): Promise<Effect | null> {
    // Check cache first
    if (this.effectsCache.has(name)) {
      return this.effectsCache.get(name)!;
    }

    // Try loading from file
    try {
      const effectPath = path.join(this.effectsDirectory, `${name}.yaml`);
      const effectContent = await fs.readFile(effectPath, 'utf8');
      const effectData = yaml.parse(effectContent);
      
      const effect = this.parseEffect(effectData, name);
      this.effectsCache.set(name, effect);
      
      return effect;
      
    } catch (error) {
      // Try .yml extension
      try {
        const effectPath = path.join(this.effectsDirectory, `${name}.yml`);
        const effectContent = await fs.readFile(effectPath, 'utf8');
        const effectData = yaml.parse(effectContent);
        
        const effect = this.parseEffect(effectData, name);
        this.effectsCache.set(name, effect);
        
        return effect;
        
      } catch (ymlError) {
        console.warn(`🎨 Effects: Effect "${name}" not found`);
        return null;
      }
    }
  }

  async saveEffect(effect: Effect): Promise<void> {
    try {
      const effectPath = path.join(this.effectsDirectory, `${effect.name}.yaml`);
      const effectData = this.serializeEffect(effect);
      const yamlContent = yaml.stringify(effectData, {
        indent: 2,
        lineWidth: -1,
        minContentWidth: 0
      });
      
      // Ensure directory exists
      await fs.mkdir(this.effectsDirectory, { recursive: true });
      
      await fs.writeFile(effectPath, yamlContent, 'utf8');
      this.effectsCache.set(effect.name, effect);
      
      console.log(`🎨 Effects: Saved effect "${effect.name}"`);
      
    } catch (error) {
      console.error(`🎨 Effects: Failed to save effect "${effect.name}":`, error);
      throw error;
    }
  }

  async deleteEffect(name: string): Promise<void> {
    try {
      const effectPath = path.join(this.effectsDirectory, `${name}.yaml`);
      await fs.unlink(effectPath);
      this.effectsCache.delete(name);
      
      console.log(`🎨 Effects: Deleted effect "${name}"`);
      
    } catch (error) {
      // Try .yml extension
      try {
        const effectPath = path.join(this.effectsDirectory, `${name}.yml`);
        await fs.unlink(effectPath);
        this.effectsCache.delete(name);
        
        console.log(`🎨 Effects: Deleted effect "${name}"`);
        
      } catch (ymlError) {
        console.error(`🎨 Effects: Failed to delete effect "${name}":`, error);
        throw error;
      }
    }
  }

  async getAvailableEffects(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.effectsDirectory);
      return files
        .filter(file => 
          (file.endsWith('.yaml') || file.endsWith('.yml')) && !file.startsWith('.')
        )
        .map(file => path.basename(file, path.extname(file)));
        
    } catch (error) {
      console.warn('🎨 Effects: Could not read effects directory:', error);
      return [];
    }
  }

  watchForChanges(callback: (effects: Effect[]) => void): void {
    this.watchCallbacks.push(callback);
    
    // Set up file watcher (simplified implementation)
    try {
      import('fs').then(fs => {
        try {
          fs.watch(this.effectsDirectory, { recursive: false }, async (eventType, filename) => {
            if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
              console.log(`🎨 Effects: Detected change in ${filename}, reloading...`);
              
              // Reload effects and notify watchers
              setTimeout(async () => {
                try {
                  const effects = await this.loadEffects();
                  // loadEffects already calls notifyWatchers
                } catch (error) {
                  console.error('🎨 Effects: Error reloading effects:', error);
                }
              }, 100); // Small delay to ensure file write is complete
            }
          });
          
          console.log('🎨 Effects: File watcher set up for effects directory');
          
        } catch (error) {
          console.warn('🎨 Effects: Could not set up file watcher:', error);
        }
      });
    } catch (error) {
      console.warn('🎨 Effects: File watching not available in this environment');
    }
  }

  private parseEffect(effectData: any, name: string): Effect {
    return {
      id: { value: effectData.id || name },
      name: effectData.name || name,
      description: effectData.description || '',
      tags: effectData.tags || [],
      steps: this.parseSteps(effectData.steps || []),
      parameters: this.parseParameters(effectData.parameters || []),
      metadata: {
        author: effectData.metadata?.author,
        version: effectData.metadata?.version || '1.0.0',
        created: new Date(effectData.metadata?.created || Date.now()),
        modified: new Date(effectData.metadata?.modified || Date.now()),
        requirements: effectData.metadata?.requirements || []
      }
    };
  }

  private parseDuration(duration: any): { value: number } {
    if (typeof duration === 'number') {
      return { value: duration };
    }
    if (typeof duration === 'object' && duration.value) {
      return { value: duration.value };
    }
    return { value: 1000 }; // Default 1 second
  }

  private parseIntensity(intensity: any): { value: number } {
    if (typeof intensity === 'number') {
      return { value: Math.max(0, Math.min(1, intensity)) };
    }
    if (typeof intensity === 'object' && intensity.value !== undefined) {
      return { value: Math.max(0, Math.min(1, intensity.value)) };
    }
    return { value: 1.0 }; // Default full intensity
  }

  private parseSteps(stepsData: any[]): readonly any[] {
    return stepsData.map(stepData => ({
      action: {
        type: stepData.action?.type || 'hold',
        intensity: stepData.action?.intensity ? { value: stepData.action.intensity } : undefined,
        color: stepData.action?.color || undefined
      },
      duration: { startMs: 0, durationMs: stepData.duration || 1000 },
      parameters: stepData.parameters || [],
      target: {
        type: stepData.target?.type || 'all',
        selector: stepData.target?.selector || 'all'
      }
    }));
  }

  private parseParameters(parametersData: any[]): readonly any[] {
    return parametersData.map(paramData => ({
      name: paramData.name || '',
      value: paramData.value,
      type: paramData.type || 'string'
    }));
  }

  private serializeEffect(effect: Effect): any {
    return {
      id: effect.id.value,
      name: effect.name,
      description: effect.description,
      tags: effect.tags,
      steps: effect.steps,
      parameters: effect.parameters,
      metadata: {
        author: effect.metadata.author,
        version: effect.metadata.version,
        created: effect.metadata.created.toISOString(),
        modified: effect.metadata.modified.toISOString(),
        requirements: effect.metadata.requirements
      }
    };
  }

  private notifyWatchers(effects: Effect[]): void {
    this.watchCallbacks.forEach(callback => {
      try {
        callback(effects);
      } catch (error) {
        console.error('🎨 Effects: Error in effects change callback:', error);
      }
    });
  }
}