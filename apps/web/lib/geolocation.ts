export function getBestGeolocation(options?: { timeoutMs?: number; targetAccuracyMetres?: number }) {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const targetAccuracy = options?.targetAccuracyMetres ?? 30;

  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported by this device."));
      return;
    }

    let best: GeolocationPosition | null = null;
    let readings = 0;
    let settled = false;
    let watchId = 0;

    const finish = (error?: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timer);
      if (best) resolve(best);
      else reject(error ?? new Error("A reliable location could not be captured."));
    };

    const timer = window.setTimeout(() => finish(), timeoutMs);
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        readings += 1;
        if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
        if (readings >= 3 && best.coords.accuracy <= targetAccuracy) finish();
      },
      (error) => {
        if (!best) finish(error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );
  });
}
