import { injectable } from 'inversify';
import type { 
  BeatDetectionService,
  BeatPosition
} from '../../domain/beat/beat-detection-service.js';
import type { 
  IMIDIController,
  MIDIMessage
} from '../../domain/midi/midi-controller.js';

@injectable()
export class MIDIClockBeatDetectionService implements BeatDetectionService {
  private isActive = false;
  private currentBPM: number | null = null;
  private beatCallbacks: Array<(position: BeatPosition) => void> = [];
  private barCallbacks: Array<(position: BeatPosition) => void> = [];
  
  // MIDI Clock tracking
  private clockTicks = 0;
  private lastClockTime = 0;
  private clockIntervals: number[] = [];
  private readonly maxClockHistory = 24; // 24 ticks per quarter note
  
  // Beat position tracking
  private currentBar = 1;
  private currentBeat = 1;
  private currentSixteenth = 1;
  private beatsPerBar = 4;
  
  // Timing smoothing
  private readonly smoothingWindow = 8;
  private bpmHistory: number[] = [];

  constructor(private midiController: IMIDIController) {}

  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    console.log('🥁 Beat Detection: Starting MIDI clock-based beat detection...');
    
    // Listen for MIDI clock and transport messages
    this.midiController.onMessage((message) => {
      this.handleMIDIMessage(message);
    });
    
    this.isActive = true;
    console.log('🥁 Beat Detection: Started - listening for MIDI clock signals');
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    console.log('🥁 Beat Detection: Stopping...');
    this.isActive = false;
    this.resetState();
    console.log('🥁 Beat Detection: Stopped');
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getCurrentPosition(): BeatPosition | null {
    if (!this.isActive) {
      return null;
    }

    return {
      bar: this.currentBar,
      beat: this.currentBeat,
      sixteenth: this.currentSixteenth,
      timestamp: Date.now()
    };
  }

  onBeat(callback: (position: BeatPosition) => void): void {
    this.beatCallbacks.push(callback);
  }

  onBar(callback: (position: BeatPosition) => void): void {
    this.barCallbacks.push(callback);
  }

  setBPM(bpm: number): void {
    console.log(`🥁 Beat Detection: Manual BPM set to ${bpm}`);
    this.currentBPM = bpm;
    
    // Clear auto-detected BPM history when manually set
    this.bpmHistory = [bpm];
  }

  getCurrentBPM(): number | null {
    return this.currentBPM;
  }

  private handleMIDIMessage(message: MIDIMessage): void {
    if (!this.isActive) {
      return;
    }

    switch (message.type) {
      case 'clock':
        this.handleClockTick();
        break;
        
      case 'start':
        this.handleTransportStart();
        break;
        
      case 'stop':
        this.handleTransportStop();
        break;
        
      case 'continue':
        this.handleTransportContinue();
        break;
        
      case 'song_position':
        if (message.data && message.data.length >= 2) {
          const position = (message.data[1]! << 7) | message.data[0]!;
          this.handleSongPosition(position);
        }
        break;
    }
  }

  private handleClockTick(): void {
    const now = Date.now();
    
    // Track clock intervals for BPM calculation
    if (this.lastClockTime > 0) {
      const interval = now - this.lastClockTime;
      this.clockIntervals.push(interval);
      
      // Keep only recent intervals
      if (this.clockIntervals.length > this.maxClockHistory) {
        this.clockIntervals.shift();
      }
      
      // Calculate BPM every few ticks
      if (this.clockIntervals.length >= 8 && this.clockTicks % 6 === 0) {
        this.updateBPMFromClock();
      }
    }
    
    this.lastClockTime = now;
    this.clockTicks++;
    
    // MIDI clock sends 24 ticks per quarter note
    // Each sixteenth note = 6 ticks
    if (this.clockTicks % 6 === 0) {
      this.advanceSixteenth();
    }
  }

  private updateBPMFromClock(): void {
    if (this.clockIntervals.length < 4) {
      return;
    }

    // Calculate average interval between clock ticks
    const avgInterval = this.clockIntervals.reduce((sum, interval) => sum + interval, 0) / this.clockIntervals.length;
    
    // Convert to BPM (24 ticks per quarter note, 60000ms per minute)
    const bpm = 60000 / (avgInterval * 24);
    
    // Smooth BPM calculation
    this.bpmHistory.push(bpm);
    if (this.bpmHistory.length > this.smoothingWindow) {
      this.bpmHistory.shift();
    }
    
    // Update current BPM with smoothed value
    const smoothedBPM = this.bpmHistory.reduce((sum, b) => sum + b, 0) / this.bpmHistory.length;
    
    // Only update if BPM is reasonable (60-200 BPM range)
    if (smoothedBPM >= 60 && smoothedBPM <= 200) {
      this.currentBPM = Math.round(smoothedBPM * 10) / 10; // Round to 1 decimal
    }
  }

  private advanceSixteenth(): void {
    this.currentSixteenth++;
    
    // Every 4 sixteenths = 1 beat
    if (this.currentSixteenth > 4) {
      this.currentSixteenth = 1;
      this.currentBeat++;
      
      // Fire beat callbacks
      const position = this.getCurrentPosition()!;
      this.beatCallbacks.forEach(callback => {
        try {
          callback(position);
        } catch (error) {
          console.error('🥁 Beat Detection: Error in beat callback:', error);
        }
      });
      
      // Every N beats = 1 bar (typically 4)
      if (this.currentBeat > this.beatsPerBar) {
        this.currentBeat = 1;
        this.currentBar++;
        
        // Fire bar callbacks
        this.barCallbacks.forEach(callback => {
          try {
            callback(position);
          } catch (error) {
            console.error('🥁 Beat Detection: Error in bar callback:', error);
          }
        });
      }
    }
  }

  private handleTransportStart(): void {
    console.log('🥁 Beat Detection: Transport START received');
    this.resetPosition();
  }

  private handleTransportStop(): void {
    console.log('🥁 Beat Detection: Transport STOP received');
    // Keep position but reset timing
    this.clockTicks = 0;
    this.lastClockTime = 0;
    this.clockIntervals = [];
  }

  private handleTransportContinue(): void {
    console.log('🥁 Beat Detection: Transport CONTINUE received');
    // Resume from current position
    this.lastClockTime = 0;
    this.clockIntervals = [];
  }

  private handleSongPosition(position: number): void {
    // Song position pointer is in 16th notes
    const totalSixteenths = position;
    const totalBeats = Math.floor(totalSixteenths / 4);
    const totalBars = Math.floor(totalBeats / this.beatsPerBar);
    
    this.currentBar = totalBars + 1;
    this.currentBeat = (totalBeats % this.beatsPerBar) + 1;
    this.currentSixteenth = (totalSixteenths % 4) + 1;
    
    console.log(`🥁 Beat Detection: Song position set to ${this.currentBar}:${this.currentBeat}:${this.currentSixteenth}`);
  }

  private resetPosition(): void {
    this.currentBar = 1;
    this.currentBeat = 1;
    this.currentSixteenth = 1;
  }

  private resetState(): void {
    this.resetPosition();
    this.clockTicks = 0;
    this.lastClockTime = 0;
    this.clockIntervals = [];
    this.currentBPM = null;
    this.bpmHistory = [];
    this.beatCallbacks = [];
    this.barCallbacks = [];
  }

  // Configuration methods
  setBeatsPerBar(beats: number): void {
    if (beats > 0 && beats <= 32) {
      this.beatsPerBar = beats;
      console.log(`🥁 Beat Detection: Beats per bar set to ${beats}`);
    }
  }

  getBeatsPerBar(): number {
    return this.beatsPerBar;
  }
}