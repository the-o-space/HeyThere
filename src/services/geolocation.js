/**
 * Geolocation Service - Handles location detection and cell mapping
 * Converts coordinates to cell IDs for proximity-based chat rooms
 */

// Cell size in meters (configurable)
const CELL_SIZE_METERS = 500;

class GeolocationService {
  constructor() {
    this.currentPosition = null;
    this.watchId = null;
  }

  /**
   * Get user's current location
   * @returns {Promise<GeolocationPosition>}
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = position;
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Watch location changes
   * @param {Function} callback - Called when location changes
   * @returns {number} Watch ID
   */
  watchLocation(callback) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = position;
        callback(position);
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return this.watchId;
  }

  /**
   * Stop watching location
   */
  stopWatching() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Convert coordinates to cell ID
   * @param {number} latitude
   * @param {number} longitude
   * @returns {string} Cell identifier
   */
  coordinatesToCell(latitude, longitude) {
    // Convert cell size from meters to approximate degrees
    // 1 degree latitude ≈ 111,320 meters
    const latDegreesPerCell = CELL_SIZE_METERS / 111320;
    
    // Longitude degrees vary by latitude
    // 1 degree longitude ≈ 111,320 * cos(latitude) meters
    const lonDegreesPerCell = CELL_SIZE_METERS / (111320 * Math.cos(latitude * Math.PI / 180));

    // Snap to grid
    const cellLat = Math.floor(latitude / latDegreesPerCell);
    const cellLon = Math.floor(longitude / lonDegreesPerCell);

    // Create cell ID
    return `${cellLat}_${cellLon}`;
  }

  /**
   * Get cell ID from position
   * @param {GeolocationPosition} position
   * @returns {string} Cell identifier
   */
  positionToCell(position) {
    return this.coordinatesToCell(
      position.coords.latitude,
      position.coords.longitude
    );
  }

  /**
   * Get current cell ID
   * @returns {Promise<string>} Cell identifier
   */
  async getCurrentCell() {
    const position = await this.getCurrentLocation();
    return this.positionToCell(position);
  }

  /**
   * Get cell center coordinates
   * @param {string} cellId - Cell identifier
   * @returns {Object} {latitude, longitude}
   */
  getCellCenter(cellId) {
    const [cellLat, cellLon] = cellId.split('_').map(Number);
    
    const latDegreesPerCell = CELL_SIZE_METERS / 111320;
    const centerLat = (cellLat + 0.5) * latDegreesPerCell;
    
    // Approximate longitude calculation
    const lonDegreesPerCell = CELL_SIZE_METERS / (111320 * Math.cos(centerLat * Math.PI / 180));
    const centerLon = (cellLon + 0.5) * lonDegreesPerCell;
    
    return {
      latitude: centerLat,
      longitude: centerLon
    };
  }

  /**
   * Get adjacent cell IDs (for extended discovery)
   * @param {string} cellId - Cell identifier
   * @returns {string[]} Array of adjacent cell IDs
   */
  getAdjacentCells(cellId) {
    const [cellLat, cellLon] = cellId.split('_').map(Number);
    const adjacent = [];
    
    for (let latOffset = -1; latOffset <= 1; latOffset++) {
      for (let lonOffset = -1; lonOffset <= 1; lonOffset++) {
        if (latOffset === 0 && lonOffset === 0) continue;
        adjacent.push(`${cellLat + latOffset}_${cellLon + lonOffset}`);
      }
    }
    
    return adjacent;
  }

  /**
   * Format cell ID for display
   * @param {string} cellId - Cell identifier
   * @returns {string} Human-readable cell name
   */
  formatCellName(cellId) {
    const center = this.getCellCenter(cellId);
    return `Area ${Math.abs(center.latitude).toFixed(2)}${center.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(center.longitude).toFixed(2)}${center.longitude >= 0 ? 'E' : 'W'}`;
  }
}

// Export singleton instance
export default new GeolocationService(); 