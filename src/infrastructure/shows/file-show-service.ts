import { injectable, unmanaged } from 'inversify';
import type { 
  ShowService,
  Show,
  ShowCue,
  CueAction
} from '../../domain/shows/show-service.js';
import type { BeatPosition } from '../../domain/beat/beat-detection-service.js';
import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

@injectable()
export class FileShowService implements ShowService {
  private currentShow: Show | null = null;
  private isPlayingShow = false;
  private showDirectory: string;
  private currentPosition: BeatPosition | null = null;
  private executedCues: Set<string> = new Set();

  constructor(@unmanaged() showDirectory = './shows') {
    this.showDirectory = showDirectory;
  }

  async loadShow(showName: string): Promise<Show> {
    try {
      console.log(`🎪 Show: Loading show "${showName}"...`);
      
      const showPath = path.join(this.showDirectory, `${showName}.yaml`);
      const showContent = await fs.readFile(showPath, 'utf8');
      const showData = yaml.parse(showContent);
      
      // Validate and parse show data
      const show: Show = {
        name: showData.name || showName,
        description: showData.description,
        bpm: showData.bpm,
        beatsPerBar: showData.beatsPerBar || 4,
        cues: this.parseCues(showData.cues || [])
      };

      this.currentShow = show;
      this.executedCues.clear();
      
      console.log(`🎪 Show: Loaded "${show.name}" with ${show.cues.length} cues`);
      return show;
      
    } catch (error) {
      console.error(`🎪 Show: Failed to load show "${showName}":`, error);
      throw new Error(`Failed to load show: ${error}`);
    }
  }

  async startShow(): Promise<void> {
    if (!this.currentShow) {
      throw new Error('No show loaded');
    }

    console.log(`🎪 Show: Starting "${this.currentShow.name}"`);
    this.isPlayingShow = true;
    this.executedCues.clear();
  }

  async stopShow(): Promise<void> {
    console.log('🎪 Show: Stopping show');
    this.isPlayingShow = false;
    this.executedCues.clear();
    this.currentPosition = null;
  }

  async pauseShow(): Promise<void> {
    console.log('🎪 Show: Pausing show');
    this.isPlayingShow = false;
  }

  async resumeShow(): Promise<void> {
    if (!this.currentShow) {
      throw new Error('No show loaded');
    }

    console.log('🎪 Show: Resuming show');
    this.isPlayingShow = true;
  }

  isPlaying(): boolean {
    return this.isPlayingShow;
  }

  getCurrentShow(): Show | null {
    return this.currentShow;
  }

  async onBeat(position: BeatPosition): Promise<void> {
    if (!this.isPlaying() || !this.currentShow) {
      return;
    }

    this.currentPosition = position;
    
    // Check for cues that should be triggered on this beat
    for (const cue of this.currentShow.cues) {
      const cueId = this.getCueId(cue, position);
      
      if (this.shouldExecuteCue(cue, position) && !this.executedCues.has(cueId)) {
        await this.executeCue(cue);
        this.executedCues.add(cueId);
      }
    }
  }

  async onBar(position: BeatPosition): Promise<void> {
    if (!this.isPlaying() || !this.currentShow) {
      return;
    }

    // Log bar changes for debugging
    console.log(`🎪 Show: Bar ${position.bar} - "${this.currentShow.name}"`);
    
    // Execute any bar-specific cues
    for (const cue of this.currentShow.cues) {
      if (cue.position.bar === position.bar && cue.position.beat === undefined) {
        const cueId = this.getCueId(cue, position);
        
        if (!this.executedCues.has(cueId)) {
          await this.executeCue(cue);
          this.executedCues.add(cueId);
        }
      }
    }
  }

  async getAvailableShows(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.showDirectory);
      return files
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map(file => path.basename(file, path.extname(file)));
    } catch (error) {
      console.warn('🎪 Show: Could not read shows directory:', error);
      return [];
    }
  }

  private parseCues(cuesData: any[]): ShowCue[] {
    return cuesData.map((cueData, index) => ({
      position: {
        bar: cueData.position?.bar,
        beat: cueData.position?.beat,
        sixteenth: cueData.position?.sixteenth,
        time: cueData.position?.time
      },
      actions: this.parseActions(cueData.actions || [])
    }));
  }

  private parseActions(actionsData: any[]): CueAction[] {
    return actionsData.map(actionData => ({
      type: actionData.type || 'effect',
      target: actionData.target,
      parameters: actionData.parameters || {}
    }));
  }

  private shouldExecuteCue(cue: ShowCue, position: BeatPosition): boolean {
    const cuePos = cue.position;
    
    // Check bar match
    if (cuePos.bar !== undefined && cuePos.bar !== position.bar) {
      return false;
    }
    
    // Check beat match
    if (cuePos.beat !== undefined && cuePos.beat !== position.beat) {
      return false;
    }
    
    // Check sixteenth match
    if (cuePos.sixteenth !== undefined && cuePos.sixteenth !== position.sixteenth) {
      return false;
    }
    
    // If no position specified, don't execute
    if (cuePos.bar === undefined && cuePos.beat === undefined && cuePos.time === undefined) {
      return false;
    }
    
    return true;
  }

  private getCueId(cue: ShowCue, position: BeatPosition): string {
    // Create unique ID for this cue execution to prevent duplicates
    const cuePos = cue.position;
    return `${cuePos.bar || 'x'}:${cuePos.beat || 'x'}:${cuePos.sixteenth || 'x'}:${cue.actions.length}`;
  }

  private async executeCue(cue: ShowCue): Promise<void> {
    console.log(`🎪 Show: Executing cue with ${cue.actions.length} actions`);
    
    for (const action of cue.actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error('🎪 Show: Failed to execute action:', error);
      }
    }
  }

  private async executeAction(action: CueAction): Promise<void> {
    switch (action.type) {
      case 'effect':
        console.log(`🎪 Show: Triggering effect "${action.target}" with parameters:`, action.parameters);
        // This would integrate with the effect engine service
        // await this.effectEngineService.executeEffect(action.target, action.parameters);
        break;
        
      case 'lighting':
        console.log(`🎪 Show: Setting lighting "${action.target}":`, action.parameters);
        // This would integrate with the lighting controller
        break;
        
      case 'dmx':
        console.log(`🎪 Show: DMX action "${action.target}":`, action.parameters);
        // This would integrate with the DMX controller
        break;
        
      case 'audio':
        console.log(`🎪 Show: Audio action "${action.target}":`, action.parameters);
        // This would integrate with audio system
        break;
        
      default:
        console.warn(`🎪 Show: Unknown action type: ${action.type}`);
    }
  }
}