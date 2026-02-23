class MarkerRegistry {
  private markers = new Map<string, unknown>();

  set(name: string, value: unknown): void {
    this.markers.set(name, value);
  }

  remove(name: string): void {
    this.markers.delete(name);
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.markers);
  }
}

export const markerRegistry = new MarkerRegistry();
