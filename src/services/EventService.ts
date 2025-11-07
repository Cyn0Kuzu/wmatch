import { EventEmitter } from 'events';

export class EventService extends EventEmitter {
  private static instance: EventService;

  private constructor() {
    super();
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  public async initialize(): Promise<void> {
    // EventService initialization if needed
  }

  // CurrentMovieBar güncelleme eventi
  public emitCurrentMovieUpdate() {
    this.emit('currentMovieUpdate');
  }

  // Currently watching listesi güncelleme eventi
  public emitCurrentlyWatchingUpdate() {
    this.emit('currentlyWatchingUpdate');
  }

  // Match sistemi güncelleme eventi
  public emitMatchUpdate() {
    this.emit('matchUpdate');
  }
}

export const eventService = EventService.getInstance();




