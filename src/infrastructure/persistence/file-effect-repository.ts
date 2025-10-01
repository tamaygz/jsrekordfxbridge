import { injectable } from 'inversify';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'yaml';
import type { 
  Effect, 
  EffectRepository,
  EffectMetadata,
  EffectStep
} from '../../domain/effects/effect.js';
import type { EffectId } from '../../types/domain/effects.js';

@injectable()
export class FileEffectRepository implements EffectRepository {
  private effects = new Map<string, Effect>();
  
  constructor(private effectsDirectory: string = 'effects') {}

  async findById(id: EffectId): Promise<Effect | null> {
    return this.effects.get(id.value) || null;
  }

  async findByTag(tag: string): Promise<Effect[]> {
    return Array.from(this.effects.values())
      .filter(effect => effect.tags.includes(tag));
  }

  async save(effect: Effect): Promise<void> {
    this.effects.set(effect.id.value, effect);
  }

  async delete(id: EffectId): Promise<void> {
    this.effects.delete(id.value);
  }

  async list(): Promise<Effect[]> {
    return Array.from(this.effects.values());
  }

  async loadFromDirectory(directory?: string): Promise<void> {
    const effectsDir = directory || this.effectsDirectory;
    
    try {
      const files = await fs.readdir(effectsDir);
      const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      for (const file of yamlFiles) {
        try {
          const filePath = path.join(effectsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const effectData = parse(content);
          
          const effect = this.parseEffectFromYAML(effectData, file);
          await this.save(effect);
          
          console.log(`📋 Loaded effect: ${effect.name}`);
        } catch (error) {
          console.warn(`Failed to load effect from ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to load effects from directory ${effectsDir}:`, error);
    }
  }

  private parseEffectFromYAML(data: any, filename: string): Effect {
    const effectId = data.name || path.parse(filename).name;
    
    return {
      id: { value: effectId },
      name: data.name || effectId,
      description: data.description,
      tags: Array.isArray(data.tags) ? data.tags : [],
      steps: this.parseSteps(data.pattern || []),
      parameters: this.parseParameters(data.params || {}),
      metadata: this.parseMetadata(data, filename)
    };
  }

  private parseSteps(pattern: any[]): EffectStep[] {
    return pattern.map((step, index) => ({
      action: {
        type: step.action || 'hold',
        ...(step.params?.intensity && { intensity: { value: step.params.intensity / 255 } }),
        ...(step.params?.color && {
          color: {
            r: step.params.color[0] || 0,
            g: step.params.color[1] || 0,
            b: step.params.color[2] || 0
          }
        })
      },
      duration: {
        startMs: 0,
        durationMs: step.params?.ms || step.params?.duration || 100
      },
      parameters: [],
      target: {
        type: step.target || 'all',
        selector: step.target || 'all'
      }
    }));
  }

  private parseParameters(params: any): any[] {
    return Object.entries(params).map(([name, value]) => ({
      name,
      value,
      type: this.inferParameterType(value)
    }));
  }

  private parseMetadata(data: any, filename: string): EffectMetadata {
    return {
      author: data.author,
      version: data.version || '1.0.0',
      created: new Date(),
      modified: new Date(),
      requirements: data.requirements || []
    };
  }

  private inferParameterType(value: unknown): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value) && value.length === 3) return 'color';
    return 'string';
  }
}