import type { Request, Response } from "express";

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const isDev = process.env.NODE_ENV === "development";

type GeoCacheEntry = {
  expiresAt: number;
  data: unknown;
};

const geoCache = new Map<string, GeoCacheEntry>();
const GEO_CACHE_TTL_MS = 60 * 1000;

const getFromCache = <T>(key: string): T | null => {
  const cached = geoCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    geoCache.delete(key);
    return null;
  }
  return cached.data as T;
};

const setCache = (key: string, data: unknown): void => {
  geoCache.set(key, {
    expiresAt: Date.now() + GEO_CACHE_TTL_MS,
    data,
  });
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of geoCache.entries()) {
    if (value.expiresAt <= now) {
      geoCache.delete(key);
    }
  }
}, GEO_CACHE_TTL_MS).unref();

const fetchJson = async (url: string): Promise<any> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    if (isDev) {
      console.log(`[GEO] Fetching: ${url}`);
    }
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (isDev) {
        console.error(`[GEO] HTTP ${response.status}`);
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (isDev) {
      console.log(
        `[GEO] Response received:`,
        JSON.stringify(data).substring(0, 200),
      );
    }
    return data;
  } catch (error) {
    if (isDev) {
      console.error(`[GEO] Fetch error:`, error);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const autocompleteLocation = async (req: Request, res: Response) => {
  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Query is required",
      data: [],
    });
  }

  try {
    const cacheKey = `autocomplete:${query.toLowerCase()}`;
    const cached = getFromCache<
      Array<{
        label: string;
        lat: number;
        lon: number;
        placeId: string;
        city?: string;
        state?: string;
        pincode?: string;
      }>
    >(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        message: "Locations fetched from cache",
        data: cached,
      });
    }

    if (!GEOAPIFY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Geoapify API key not configured",
        data: [],
      });
    }

    if (isDev) {
      console.log(`[GEO] Autocomplete query: "${query}"`);
    }
    const geoapifyUrl = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
      query,
    )}&apiKey=${encodeURIComponent(GEOAPIFY_API_KEY)}&filter=countrycode:in`;

    const geoapifyData: any = await fetchJson(geoapifyUrl);

    if (!geoapifyData?.features) {
      if (isDev) {
        console.error(`[GEO] Geoapify returned unexpected format or error`);
      }
      return res.status(400).json({
        success: false,
        message: "No results found",
        data: [],
      });
    }

    const predictions = geoapifyData.features.slice(0, 6);

    const results = predictions.map((feature: any) => {
      const props = feature.properties;
      return {
        label: props.formatted,
        lat: props.lat,
        lon: props.lon,
        placeId: props.place_id,
        city: props.city || props.county,
        state: props.state,
        pincode: props.postcode,
      };
    });

    setCache(cacheKey, results);

    if (isDev) {
      console.log(`[GEO] Total results: ${results.length}`);
    }
    return res.json({
      success: true,
      message: "Locations fetched from Geoapify",
      data: results,
    });
  } catch (error) {
    if (isDev) {
      console.error(`[GEO] Autocomplete error:`, error);
    }
    return res.status(500).json({
      success: false,
      message: "Failed to fetch location suggestions",
      data: [],
    });
  }
};

export const geocodeAddress = async (req: Request, res: Response) => {
  const address = String(req.query.address || "").trim();
  if (!address) {
    return res.status(400).json({
      success: false,
      message: "Address is required",
      data: null,
    });
  }

  try {
    const cacheKey = `geocode:${address.toLowerCase()}`;
    const cached = getFromCache<{
      label: string;
      lat: number;
      lon: number;
    } | null>(cacheKey);
    if (cached !== null) {
      return res.json({
        success: true,
        message: "Geocode success (cache)",
        data: cached,
      });
    }

    if (!GEOAPIFY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Geoapify API key not configured",
        data: null,
      });
    }

    if (isDev) {
      console.log(`[GEO] Geocoding address: "${address}"`);
    }
    const geoapifyUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      address,
    )}&apiKey=${encodeURIComponent(GEOAPIFY_API_KEY)}&filter=countrycode:in`;

    const geoapifyData: any = await fetchJson(geoapifyUrl);

    if (!geoapifyData?.features || geoapifyData.features.length === 0) {
      if (isDev) {
        console.error(`[GEO] Geocode empty result`);
      }
      setCache(cacheKey, null);
      return res.json({
        success: true,
        message: "No results",
        data: null,
      });
    }

    const props = geoapifyData.features[0].properties;
    if (isDev) {
      console.log(`[GEO] Geocoded: ${props.formatted}`);
    }

    const payload = {
      label: props.formatted,
      lat: props.lat,
      lon: props.lon,
    };

    setCache(cacheKey, payload);

    return res.json({
      success: true,
      message: "Geocode success",
      data: payload,
    });
  } catch (error) {
    if (isDev) {
      console.error(`[GEO] Geocode error:`, error);
    }
    return res.status(500).json({
      success: false,
      message: "Failed to geocode address",
      data: null,
    });
  }
};

export const reverseGeocode = async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required",
      data: null,
    });
  }

  try {
    const cacheKey = `reverse:${lat}:${lon}`;
    const cached = getFromCache<{
      label: string;
      lat: number;
      lon: number;
    } | null>(cacheKey);
    if (cached !== null) {
      return res.json({
        success: true,
        message: "Reverse geocode success (cache)",
        data: cached,
      });
    }

    if (!GEOAPIFY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Geoapify API key not configured",
        data: null,
      });
    }

    if (isDev) {
      console.log(`[GEO] Reverse geocoding: lat=${lat}, lon=${lon}`);
    }
    const geoapifyUrl = `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lon))}&apiKey=${encodeURIComponent(
      GEOAPIFY_API_KEY,
    )}`;

    const geoapifyData: any = await fetchJson(geoapifyUrl);

    if (!geoapifyData?.features || geoapifyData.features.length === 0) {
      if (isDev) {
        console.error(`[GEO] Reverse geocode empty result`);
      }
      setCache(cacheKey, null);
      return res.json({
        success: true,
        message: "No results",
        data: null,
      });
    }

    const props = geoapifyData.features[0].properties;
    if (isDev) {
      console.log(`[GEO] Reverse geocoded: ${props.formatted}`);
    }

    const payload = {
      label: props.formatted,
      lat,
      lon,
    };

    setCache(cacheKey, payload);

    return res.json({
      success: true,
      message: "Reverse geocode success",
      data: payload,
    });
  } catch (error) {
    if (isDev) {
      console.error(`[GEO] Reverse geocode error:`, error);
    }
    return res.status(500).json({
      success: false,
      message: "Failed to reverse geocode",
      data: null,
    });
  }
};
