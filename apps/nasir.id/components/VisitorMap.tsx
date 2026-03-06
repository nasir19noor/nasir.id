'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationData {
    latitude: number;
    longitude: number;
    country: string;
    city: string;
    visit_count: number;
    unique_visitors: number;
    last_visit: string;
}

interface VisitorMapProps {
    days: number;
}

export default function VisitorMap({ days }: VisitorMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [leafletLoaded, setLeafletLoaded] = useState(false);

    // Load Leaflet dynamically
    useEffect(() => {
        const loadLeaflet = async () => {
            if (typeof window !== 'undefined' && !leafletLoaded) {
                // Load Leaflet CSS
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);

                // Load Leaflet JS
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = () => setLeafletLoaded(true);
                document.head.appendChild(script);
            }
        };

        loadLeaflet();
    }, [leafletLoaded]);

    // Fetch location data
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await fetch(`/api/analytics/locations?days=${days}`, {
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    setLocations(data.locations || []);
                }
            } catch (error) {
                console.error('Error fetching locations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLocations();
    }, [days]);

    // Initialize map when Leaflet is loaded and we have data
    useEffect(() => {
        if (!leafletLoaded || !mapRef.current || locations.length === 0) return;

        // Clean up existing map
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
        }

        // Initialize map
        const L = (window as any).L;
        const map = L.map(mapRef.current).setView([20, 0], 2);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add markers for each location
        locations.forEach((location) => {
            const markerSize = Math.min(Math.max(location.visit_count * 2, 10), 50);
            
            // Create custom icon based on visit count
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `
                    <div style="
                        width: ${markerSize}px;
                        height: ${markerSize}px;
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        border: 3px solid white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: ${Math.max(markerSize / 4, 8)}px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">
                        ${location.visit_count}
                    </div>
                `,
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize / 2, markerSize / 2]
            });

            const marker = L.marker([location.latitude, location.longitude], {
                icon: customIcon
            }).addTo(map);

            // Add popup with location details
            const popupContent = `
                <div style="font-family: system-ui, -apple-system, sans-serif;">
                    <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">
                        📍 ${location.city}, ${location.country}
                    </h3>
                    <div style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                        <div><strong>Total Visits:</strong> ${location.visit_count}</div>
                        <div><strong>Unique Visitors:</strong> ${location.unique_visitors}</div>
                        <div><strong>Last Visit:</strong> ${new Date(location.last_visit).toLocaleDateString()}</div>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
        });

        mapInstanceRef.current = map;

        // Cleanup function
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }
        };
    }, [leafletLoaded, locations]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border-2 border-green-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🗺️ Visitor Locations
                </h2>
                <div className="flex items-center justify-center h-96">
                    <p className="text-gray-500">Loading map...</p>
                </div>
            </div>
        );
    }

    if (locations.length === 0) {
        return (
            <div className="bg-white rounded-2xl border-2 border-green-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🗺️ Visitor Locations
                </h2>
                <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl">
                    <div className="text-center">
                        <p className="text-gray-500 mb-2">No location data available</p>
                        <p className="text-sm text-gray-400">
                            Location data will appear here as visitors access your site
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border-2 border-green-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                    🗺️ Visitor Locations
                </h2>
                <div className="text-sm text-gray-500">
                    {locations.length} location{locations.length !== 1 ? 's' : ''}
                </div>
            </div>
            
            {/* Map Container */}
            <div 
                ref={mapRef} 
                className="h-96 w-full rounded-xl border border-gray-200"
                style={{ minHeight: '400px' }}
            />
            
            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full border-2 border-white"></div>
                    <span>Visitor location (size = visit count)</span>
                </div>
                <div className="text-xs text-gray-400">
                    Click markers for details
                </div>
            </div>
        </div>
    );
}