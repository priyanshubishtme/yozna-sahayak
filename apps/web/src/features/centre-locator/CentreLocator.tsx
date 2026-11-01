import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import './centre-locator.css';
import {
  CategoryKey,
  CategoryInfo,
  SchemeInfo,
  GeoLocation,
  CentreItem,
} from './types';
import {
  geocode,
  fetchCentres,
  haversineKm,
  formatDistance,
} from './services/api';

const SCHEMES: SchemeInfo[] = [
  {
    id: 'pmkisan',
    name: 'PM-KISAN Samman Nidhi',
    help: 'Registration, e-KYC and document support.',
    relevant: ['agri', 'csc', 'govt'],
  },
  {
    id: 'pmjay',
    name: 'Ayushman Bharat PM-JAY',
    help: 'Health-scheme enrolment and hospital information.',
    relevant: ['health', 'csc'],
  },
  {
    id: 'pmay',
    name: 'Pradhan Mantri Awas Yojana',
    help: 'Housing application and document assistance.',
    relevant: ['govt', 'csc'],
  },
  {
    id: 'pmfby',
    name: 'PM Fasal Bima Yojana',
    help: 'Crop-insurance enrolment and claim guidance.',
    relevant: ['agri', 'csc'],
  },
  {
    id: 'ssy',
    name: 'Sukanya Samriddhi Yojana',
    help: 'Account-opening and KYC guidance.',
    relevant: ['post', 'csc'],
  },
];

const CATEGORIES: Record<CategoryKey, CategoryInfo> = {
  csc: { label: 'CSC (name-based)', short: 'CSC', color: '#157a53', glyph: 'C' },
  agri: { label: 'Agriculture Office', short: 'Agriculture', color: '#6a9a1f', glyph: 'A' },
  govt: { label: 'Government Office', short: 'Govt Office', color: '#d9791a', glyph: 'G' },
  health: { label: 'Healthcare Facility', short: 'Healthcare', color: '#c0345c', glyph: '+' },
  post: { label: 'Post Office', short: 'Post Office', color: '#2f6fb0', glyph: 'P' },
};

const VERIFY_STATUS: Record<string, string> = {
  osm_listed: 'Listed on OpenStreetMap — not officially verified',
  verified: 'Officially verified',
  pending: 'Verification pending',
  unverified: 'Unverified',
};

export const CentreLocator: React.FC = () => {
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(SCHEMES[0].id);
  const [placeInput, setPlaceInput] = useState<string>('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locNote, setLocNote] = useState<{ text: string; kind: 'ok' | 'warn' }>({
    text: 'No location set. Enter a city, locality or PIN code, or use your location.',
    kind: 'warn',
  });
  const [radius, setRadius] = useState<number>(10);
  const [choices, setChoices] = useState<GeoLocation[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ html: string; kind: '' | 'warn' | 'err' }>({
    html: '<b>Live data search</b> · Source: OpenStreetMap · Listings are not officially verified.',
    kind: '',
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'near' | 'name'>('near');
  const [relevantOnly, setRelevantOnly] = useState<boolean>(false);

  const [allCentres, setAllCentres] = useState<CentreItem[]>([]);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const youMarkerRef = useRef<L.Marker | null>(null);
  const markersMapRef = useRef<Record<string, L.Marker>>({});

  const currentScheme = useMemo(
    () => SCHEMES.find((s) => s.id === selectedSchemeId) || SCHEMES[0],
    [selectedSchemeId]
  );

  const isPotential = (c: CentreItem) => currentScheme.relevant.includes(c.category);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2800);
  };

  // Create custom category pin icon
  const createPinIcon = (cat: CategoryKey, selected: boolean) => {
    const c = CATEGORIES[cat] || { color: '#157a53', glyph: '•' };
    return L.divIcon({
      className: '',
      iconSize: selected ? [38, 38] : [30, 30],
      iconAnchor: selected ? [19, 38] : [15, 30],
      popupAnchor: [0, -30],
      html: `<div class="pin ${selected ? 'sel' : ''}" style="background:${c.color}"><span>${c.glyph}</span></div>`,
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView([22.9, 79.6], 5);
    mapInstanceRef.current = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Filter & Sort centres
  const visibleCentres = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return allCentres
      .map((c) => ({
        ...c,
        dist: location ? haversineKm(location.lat, location.lng, c.latitude, c.longitude) : null,
      }))
      .filter((c) => c.dist == null || c.dist <= radius)
      .filter((c) => activeCategory === 'all' || c.category === activeCategory)
      .filter((c) => !q || `${c.name} ${c.address || ''}`.toLowerCase().includes(q))
      .filter((c) => !relevantOnly || isPotential(c))
      .sort((a, b) =>
        sortOption === 'name'
          ? a.name.localeCompare(b.name)
          : (a.dist ?? 1e9) - (b.dist ?? 1e9)
      );
  }, [allCentres, location, radius, activeCategory, filterQuery, relevantOnly, sortOption, currentScheme]);

  const selectedCentre = useMemo(
    () => visibleCentres.find((c) => c.id === selectedCentreId) || null,
    [visibleCentres, selectedCentreId]
  );

  // Update Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    markersMapRef.current = {};

    visibleCentres.forEach((c) => {
      if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return;

      const isSel = c.id === selectedCentreId;
      const m = L.marker([c.latitude, c.longitude], {
        icon: createPinIcon(c.category, isSel),
        title: c.name,
      });

      const distStr = c.dist != null ? `${formatDistance(c.dist)} (approx. straight line)<br>` : '';
      m.bindPopup(
        `<div class="pop"><b>${c.name}</b>${distStr}<button type="button" data-view-id="${c.id}">View Details</button></div>`
      );

      m.on('click', () => {
        setSelectedCentreId(c.id);
      });

      m.addTo(markerLayer);
      markersMapRef.current[c.id] = m;
    });
  }, [visibleCentres, selectedCentreId]);

  // Handle global popup view button
  useEffect(() => {
    const handlePopupClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-view-id]');
      if (target) {
        const id = target.getAttribute('data-view-id');
        if (id) {
          setSelectedCentreId(id);
          mapInstanceRef.current?.closePopup();
        }
      }
    };
    document.addEventListener('click', handlePopupClick);
    return () => document.removeEventListener('click', handlePopupClick);
  }, []);

  // Update User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (youMarkerRef.current) {
      youMarkerRef.current.remove();
      youMarkerRef.current = null;
    }

    if (location) {
      youMarkerRef.current = L.marker([location.lat, location.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div class="you"></div>',
          iconSize: [16, 16],
        }),
        interactive: false,
      }).addTo(map);
    }
  }, [location]);

  const fitResults = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pts: [number, number][] = Object.values(markersMapRef.current).map((m) => {
      const ll = m.getLatLng();
      return [ll.lat, ll.lng];
    });
    if (location) {
      pts.push([location.lat, location.lng]);
    }
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 15 });
    } else if (pts.length === 1) {
      map.setView(pts[0], 13);
    }
  };

  const handleSelectLocation = (loc: GeoLocation) => {
    setLocation(loc);
    setChoices([]);
    setLocNote({
      text: `${loc.pin ? 'PIN area (approximate centre): ' : ''}${loc.name}`,
      kind: 'ok',
    });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 13);
    }
    executeCentreSearch(loc, radius);
  };

  const executeCentreSearch = async (loc: GeoLocation, searchRadius: number) => {
    setPhase('loading');
    setSelectedCentreId(null);
    setAllCentres([]);
    setStatusMsg({ html: 'Searching OpenStreetMap data…', kind: '' });

    try {
      const { centres, skipped } = await fetchCentres(loc.lat, loc.lng, searchRadius);
      setAllCentres(centres);
      setPhase('done');

      const msg =
        `<b>Live data search</b> · Source: OpenStreetMap · ${centres.length} listing${
          centres.length === 1 ? '' : 's'
        } within ${searchRadius} km · Listings are not officially verified.` +
        (skipped ? ` ${skipped} record(s) without a usable name or location were left out.` : '');

      setStatusMsg({
        html: msg,
        kind: centres.length ? '' : 'warn',
      });

      // Fit map bounds
      setTimeout(() => fitResults(), 100);
    } catch (err: any) {
      setPhase('error');
      setErrorMessage(err.message || 'Could not reach the place-data service.');
      setStatusMsg({
        html: `Search failed. No results are shown. ${err.message || ''}`,
        kind: 'err',
      });
    }
  };

  const handleSearchSubmit = async () => {
    const text = placeInput.trim();
    if (!text && !location) {
      setStatusMsg({ html: 'Enter a place or use your location first.', kind: 'warn' });
      return;
    }

    setIsSearching(true);
    try {
      if (text && (!location || location.typed !== text)) {
        if (!/^\d{6}$/.test(text) && text.length < 3) {
          throw new Error('Enter at least 3 characters, or a 6-digit PIN code.');
        }

        setStatusMsg({ html: 'Looking up location…', kind: '' });
        const hits = await geocode(text);

        if (!hits.length) {
          setAllCentres([]);
          setPhase('idle');
          setStatusMsg({
            html: /^\d{6}$/.test(text)
              ? 'No location matched that PIN code exactly. Try the city or locality name.'
              : 'Location not found. Try a nearby locality, city or PIN code.',
            kind: 'warn',
          });
          return;
        }

        if (hits.length > 1 && (hits[0].importance || 0) - (hits[1].importance || 0) < 0.15) {
          setChoices(hits);
          setStatusMsg({ html: 'Please choose the intended location above.', kind: 'warn' });
          return;
        }

        handleSelectLocation(hits[0]);
      } else if (location) {
        executeCentreSearch(location, radius);
      }
    } catch (e: any) {
      setPhase('error');
      setErrorMessage(e.message);
      setStatusMsg({ html: e.message, kind: 'err' });
    } finally {
      setIsSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocNote({
        text: 'This browser does not support location. Search a place instead.',
        kind: 'warn',
      });
      return;
    }

    setLocNote({ text: 'Waiting for location permission…', kind: 'warn' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlaceInput('');
        const myLoc: GeoLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'Your current location (device-reported)',
          typed: null,
        };
        handleSelectLocation(myLoc);
      },
      (err) => {
        setLocNote({
          text:
            err.code === 1
              ? 'Location permission was denied. Type a city, locality or PIN code instead.'
              : 'Could not detect your location. Type a place instead.',
          kind: 'warn',
        });
      },
      { timeout: 10000 }
    );
  };

  const selectCentre = (c: CentreItem) => {
    setSelectedCentreId(c.id);
    if (mapInstanceRef.current && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
      mapInstanceRef.current.flyTo(
        [c.latitude, c.longitude],
        Math.max(mapInstanceRef.current.getZoom(), 15),
        { duration: 0.5 }
      );
      markersMapRef.current[c.id]?.openPopup();
    }
    if (window.innerWidth <= 760) {
      setMobileView('map');
    }
  };

  const getDirectionsUrl = (c: CentreItem) => {
    const dest =
      Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
        ? `${c.latitude},${c.longitude}`
        : c.address
        ? encodeURIComponent(c.address)
        : null;
    return dest ? `https://www.google.com/maps/dir/?api=1&destination=${dest}` : null;
  };

  const handleCentreAction = async (act: 'directions' | 'call' | 'share' | 'copy') => {
    if (!selectedCentre) return;

    if (act === 'directions') {
      const url = getDirectionsUrl(selectedCentre);
      if (url) {
        window.open(url, '_blank', 'noopener');
      } else {
        showToast('No location or address is available for directions.');
      }
      return;
    }

    if (act === 'call') {
      if (selectedCentre.phone) {
        window.location.href = `tel:${selectedCentre.phone.replace(/[^\d+]/g, '')}`;
      } else {
        showToast('No valid phone number available.');
      }
      return;
    }

    const text =
      act === 'copy'
        ? selectedCentre.address || selectedCentre.name
        : `${selectedCentre.name}${selectedCentre.address ? ', ' + selectedCentre.address : ''}\n${
            getDirectionsUrl(selectedCentre) || ''
          }`.trim();

    if (act === 'share' && navigator.share) {
      try {
        await navigator.share({ title: selectedCentre.name, text });
      } catch {
        // User cancelled share
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast(act === 'copy' ? 'Address copied' : 'Centre details copied');
    } catch {
      showToast('Could not copy to clipboard.');
    }
  };

  return (
    <div className="centre-locator-container">
      <main className="page">
        {/* Intro */}
        <section className="intro">
          <div>
            <h1>Find Nearby Assistance Centres</h1>
            <p>Get help with registration, verification, documents and scheme applications.</p>
          </div>
          <div className="scheme-box">
            <label htmlFor="scheme">Select scheme</label>
            <select
              id="scheme"
              value={selectedSchemeId}
              onChange={(e) => setSelectedSchemeId(e.target.value)}
            >
              {SCHEMES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p id="schemeHelp">{currentScheme.help}</p>
          </div>
        </section>

        {/* Search Toolbar */}
        <section className="toolbar" aria-label="Location search">
          <div className="field">
            <label className="sr" htmlFor="place">
              Locality, city or PIN code
            </label>
            <input
              id="place"
              type="search"
              placeholder="Locality, city or PIN code"
              value={placeInput}
              onChange={(e) => setPlaceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit();
              }}
              autoComplete="off"
            />
          </div>
          <button className="btn ghost" id="useLoc" type="button" onClick={useMyLocation}>
            Use My Location
          </button>
          <p className={`loc-status ${locNote.kind}`} role="status">
            <span className="dot"></span>
            <span>{locNote.text}</span>
          </p>
          <div className="radius">
            <select
              id="radius"
              aria-label="Distance radius"
              value={radius}
              onChange={(e) => {
                const newR = Number(e.target.value);
                setRadius(newR);
                if (location) executeCentreSearch(location, newR);
              }}
            >
              <option value={2}>Within 2 km</option>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
            </select>
          </div>
          <button
            className="btn primary"
            id="searchBtn"
            type="button"
            disabled={isSearching}
            onClick={handleSearchSubmit}
          >
            {isSearching ? 'Searching…' : 'Search Centres'}
          </button>
        </section>

        {/* Disambiguation Choices */}
        {choices.length > 0 && (
          <div className="choices">
            <p>Several places match. Which did you mean?</p>
            {choices.map((hit, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectLocation(hit)}
              >
                {hit.name}
              </button>
            ))}
          </div>
        )}

        {/* Status Bar */}
        <div
          className={`status ${statusMsg.kind}`}
          role="status"
          dangerouslySetInnerHTML={{ __html: statusMsg.html }}
        />

        {/* Mobile View Toggle */}
        <div className="view-toggle" role="group" aria-label="Switch view">
          <button
            type="button"
            className={mobileView === 'list' ? 'on' : ''}
            onClick={() => setMobileView('list')}
          >
            List
          </button>
          <button
            type="button"
            className={mobileView === 'map' ? 'on' : ''}
            onClick={() => {
              setMobileView('map');
              setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
            }}
          >
            Map
          </button>
        </div>

        {/* 3-Column Layout */}
        <div className="layout" data-view={mobileView}>
          {/* Column 1: List Panel */}
          <aside className="panel list-panel" aria-label="Nearby centres">
            <div className="panel-head">
              <h2>Nearby Centres</h2>
              <p>
                {phase === 'loading'
                  ? 'Searching…'
                  : phase === 'idle'
                  ? 'No search yet'
                  : `${visibleCentres.length} centre${
                      visibleCentres.length === 1 ? '' : 's'
                    } found`}
              </p>
              <input
                id="centreSearch"
                type="search"
                placeholder="Search by name or address"
                aria-label="Search centres"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
              <div className="chips" role="group" aria-label="Filter by category">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                >
                  All
                </button>
                {(Object.keys(CATEGORIES) as CategoryKey[]).map((catKey) => (
                  <button
                    key={catKey}
                    type="button"
                    className="chip"
                    aria-pressed={activeCategory === catKey}
                    onClick={() => setActiveCategory(catKey)}
                  >
                    {CATEGORIES[catKey].short}
                  </button>
                ))}
              </div>
              <div className="sort-row">
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={relevantOnly}
                    onChange={(e) => setRelevantOnly(e.target.checked)}
                  />
                  Potential matches only
                </label>
                <select
                  aria-label="Sort centres"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as 'near' | 'name')}
                >
                  <option value="near">Nearest First</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>

            <ul className="cards">
              {phase === 'idle' && (
                <li className="empty">
                  <b>Search to begin</b>
                  Enter a city, locality or PIN code, or use your location.
                </li>
              )}
              {phase === 'loading' && (
                <li className="empty">Searching OpenStreetMap data…</li>
              )}
              {phase === 'error' && (
                <li className="empty">
                  <b>The search failed</b>
                  {errorMessage}
                  <br />
                  <button
                    className="btn primary"
                    style={{ marginTop: 10 }}
                    onClick={() => location && executeCentreSearch(location, radius)}
                  >
                    Retry
                  </button>
                </li>
              )}
              {phase === 'done' && visibleCentres.length === 0 && (
                <li className="empty">
                  <b>No matching centres found in available data.</b>
                  OpenStreetMap may have limited coverage in this specific area.
                  <br />
                  <button
                    className="btn"
                    style={{ marginTop: 10, marginRight: 8 }}
                    onClick={() => {
                      const newR = Math.min(25, radius === 2 ? 5 : radius === 5 ? 10 : 25);
                      setRadius(newR);
                      if (location) executeCentreSearch(location, newR);
                    }}
                  >
                    Increase radius
                  </button>
                  <button
                    className="btn"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      setActiveCategory('all');
                      setFilterQuery('');
                      setRelevantOnly(false);
                    }}
                  >
                    Clear filters
                  </button>
                </li>
              )}
              {visibleCentres.map((c) => {
                const cat = CATEGORIES[c.category];
                const isSel = c.id === selectedCentreId;
                return (
                  <li key={c.id}>
                    <button
                      className={`card ${isSel ? 'sel' : ''}`}
                      type="button"
                      aria-pressed={isSel}
                      onClick={() => selectCentre(c)}
                    >
                      <span className="glyph" style={{ background: cat.color }}>
                        {cat.glyph}
                      </span>
                      <span className="txt">
                        <span className="row">
                          <b>{c.name}</b>
                          <span className="dist">{formatDistance(c.dist)}</span>
                        </span>
                        <small>{c.address || 'Address not available'}</small>
                        <small className="meta">
                          {cat.label}
                          {isPotential(c) ? ' · Potential match' : ''}
                        </small>
                      </span>
                      <span className="arrow" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Column 2: Leaflet Map */}
          <section className="map-wrap" aria-label="Map">
            <div id="map" ref={mapContainerRef} />
            <div className="legend">
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((catKey) => (
                <span key={catKey}>
                  <i style={{ background: CATEGORIES[catKey].color }} />
                  {CATEGORIES[catKey].short}
                </span>
              ))}
            </div>
            <button
              className="fit"
              type="button"
              title="Fit all results"
              onClick={fitResults}
            >
              Fit results
            </button>
          </section>

          {/* Column 3: Centre Details Panel */}
          <aside
            className={`panel details ${selectedCentre ? 'open' : ''}`}
            aria-live="polite"
          >
            {selectedCentre ? (
              <>
                <div className="d-top">
                  <span
                    className="glyph"
                    style={{ background: CATEGORIES[selectedCentre.category].color }}
                  >
                    {CATEGORIES[selectedCentre.category].glyph}
                  </span>
                  <div>
                    <h2>{selectedCentre.name}</h2>
                    <span className="tag">{CATEGORIES[selectedCentre.category].label}</span>
                  </div>
                  <button
                    className="close"
                    type="button"
                    aria-label="Close details"
                    onClick={() => setSelectedCentreId(null)}
                  >
                    ✕
                  </button>
                </div>

                <p className="addr">
                  {selectedCentre.address || 'Address not available in source'}
                  {selectedCentre.dist != null && (
                    <>
                      <br />
                      <b>{formatDistance(selectedCentre.dist)}</b> approx. straight-line distance
                    </>
                  )}
                </p>

                <div className="acts">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => handleCentreAction('directions')}
                  >
                    Get Directions
                  </button>
                  {selectedCentre.phone && (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => handleCentreAction('call')}
                    >
                      Call
                    </button>
                  )}
                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleCentreAction('share')}
                  >
                    Share Centre
                  </button>
                  {selectedCentre.address && (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => handleCentreAction('copy')}
                    >
                      Copy Address
                    </button>
                  )}
                </div>

                <div className="sec">
                  <h3>Relevance to {currentScheme.name}</h3>
                  <p className="note">
                    {isPotential(selectedCentre)
                      ? 'Potential match based on the type of place. '
                      : 'No relevance rule for this scheme and place type. '}
                    Services offered and scheme authorisation are not confirmed by this data.
                  </p>
                  {selectedCentre.classificationNote && (
                    <p className="note" style={{ marginTop: 6 }}>
                      {selectedCentre.classificationNote}
                    </p>
                  )}
                </div>

                <div className="sec">
                  <h3>Details</h3>
                  <div className="kv">
                    <span>Services</span>
                    <span>Not available from this source</span>
                    <span>Hours</span>
                    <span>{selectedCentre.openingHours || 'Not available'}</span>
                    <span>Phone</span>
                    <span>{selectedCentre.phone || 'Not available'}</span>
                  </div>
                </div>

                <div className="sec">
                  <h3>Source</h3>
                  <div className="kv">
                    <span>Source</span>
                    <span>
                      <a
                        href={selectedCentre.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedCentre.sourceName}
                      </a>{' '}
                      ({selectedCentre.sourceType})
                    </span>
                    <span>Status</span>
                    <span>{VERIFY_STATUS[selectedCentre.verificationStatus] || 'Listed'}</span>
                    <span>Last checked</span>
                    <span>{selectedCentre.lastVerified || 'Not available'}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="ph">Select a centre on the map or from the list to see details.</p>
            )}
          </aside>
        </div>
      </main>

      <footer className="attrib">
        Place data ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors (Overpass API). Geocoding by Nominatim. Listings are not officially verified.
      </footer>

      {/* Toast Notification */}
      <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
};

export default CentreLocator;
