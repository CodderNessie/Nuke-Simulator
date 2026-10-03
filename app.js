const presets = {
    micro: [
        {
            name: "Zone 1",
            meters: 500,
            display: "500m",
            color: "#FF4500"
        },
        {
            name: "Zone 2",
            meters: 1500,
            display: "1.5km",
            color: "#8B0000"
        },
        {
            name: "Zone 3",
            meters: 3500,
            display: "3.5km",
            color: "#FFA500"
        },
        {
            name: "Zone 4",
            meters: 5500,
            display: "5.5km",
            color: "#D3D3D3"
        }
    ],

    standard: [
        {
            name: "Zone 1",
            meters: 2000,
            display: "2km",
            color: "#FF4500"
        },
        {
            name: "Zone 2",
            meters: 6000,
            display: "6km",
            color: "#8B0000"
        },
        {
            name: "Zone 3",
            meters: 12000,
            display: "12km",
            color: "#FFA500"
        },
        {
            name: "Zone 4",
            meters: 20000,
            display: "20km",
            color: "#D3D3D3"
        }
    ],

    large: [
        {
            name: "Zone 1",
            meters: 5000,
            display: "5km",
            color: "#FF4500"
        },
        {
            name: "Zone 2",
            meters: 15000,
            display: "15km",
            color: "#8B0000"
        },
        {
            name: "Zone 3",
            meters: 35000,
            display: "35km",
            color: "#FFA500"
        },
        {
            name: "Zone 4",
            meters: 55000,
            display: "55km",
            color: "#D3D3D3"
        }
    ],

    extreme: [
        {
            name: "Zone 1",
            meters: 9000,
            display: "9km",
            color: "#FF4500"
        },
        {
            name: "Zone 2",
            meters: 25000,
            display: "25km",
            color: "#8B0000"
        },
        {
            name: "Zone 3",
            meters: 60000,
            display: "60km",
            color: "#FFA500"
        },
        {
            name: "Zone 4",
            meters: 100000,
            display: "100km",
            color: "#D3D3D3"
        }
    ],

    maximum: [
        {
            name: "Zone 1",
            meters: 12000,
            display: "12km",
            color: "#FF4500"
        },
        {
            name: "Zone 2",
            meters: 30000,
            display: "30km",
            color: "#8B0000"
        },
        {
            name: "Zone 3",
            meters: 70000,
            display: "70km",
            color: "#FFA500"
        },
        {
            name: "Zone 4",
            meters: 120000,
            display: "120km",
            color: "#D3D3D3"
        }
    ]
};

const state = {
    selectedPreset: "standard",
    target: null,
    targetMarker: null,
    rings: [],
    isAnimating: false,
    mapLocked: false
};

const elements = {
    map: document.getElementById("map"),
    zoneList: document.getElementById("zone-list"),
    targetStatus: document.getElementById("target-status"),
    latitude: document.getElementById("latitude"),
    longitude: document.getElementById("longitude"),
    activateButton: document.getElementById("activate-button"),
    searchForm: document.getElementById("search-form"),
    searchInput: document.getElementById("search-input"),
    discordStatus: document.getElementById("discord-status"),
    presetButtons: document.querySelectorAll(".preset-button")
};

const map = L.map(elements.map, {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 19
});

L.control.zoom({
    position: "topright"
}).addTo(map);

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

function updateZones() {
    const zones = presets[state.selectedPreset];

    elements.zoneList.innerHTML = zones
        .map(
            (zone) => `
                <div class="zone">
                    <div
                        class="zone-color"
                        style="
                            background:${zone.color};
                            box-shadow:0 0 8px ${zone.color};
                        "
                    ></div>

                    <div class="zone-info">
                        <div class="zone-name">
                            ${zone.name}
                        </div>

                        <div class="zone-distance">
                            ${zone.display}
                        </div>
                    </div>
                </div>
            `
        )
        .join("");
}

function clearRings() {
    for (const ring of state.rings) {
        map.removeLayer(ring);
    }

    state.rings = [];
}

function setTarget(lat, lng, zoomToTarget = false) {
    if (state.isAnimating) {
        return;
    }

    state.target = {
        lat,
        lng
    };

    if (state.targetMarker) {
        map.removeLayer(state.targetMarker);
    }

    state.targetMarker = L.marker(
        [lat, lng],
        {
            icon: L.divIcon({
                className: "target-marker-wrapper",
                html: '<div class="target-marker"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            })
        }
    ).addTo(map);

    clearRings();

    elements.targetStatus.textContent =
        "TARGET SELECTED";

    elements.targetStatus.classList.add(
        "selected"
    );

    elements.latitude.textContent =
        lat.toFixed(6);

    elements.longitude.textContent =
        lng.toFixed(6);

    elements.activateButton.disabled = false;

    elements.activateButton.textContent =
        "ACTIVATE";

    if (zoomToTarget) {
        map.setView(
            [lat, lng],
            12,
            {
                animate: true
            }
        );
    }
}

function lockMap() {
    state.mapLocked = true;

    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.touchZoom.disable();

    elements.map.style.cursor =
        "not-allowed";
}

function unlockMap() {
    state.mapLocked = false;

    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    map.touchZoom.enable();

    elements.map.style.cursor =
        "";
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animateZones() {
    return new Promise((resolve) => {

        if (!state.target) {
            resolve();
            return;
        }

        clearRings();

        const zones =
            presets[state.selectedPreset];

        const rings = zones.map((zone) => {

            return L.circle(
                [
                    state.target.lat,
                    state.target.lng
                ],
                {
                    radius: 0,

                    color: zone.color,
                    fillColor: zone.color,

                    fillOpacity: 0.05,

                    weight: 3,
                    opacity: 0.85,

                    interactive: false
                }
            ).addTo(map);

        });

        const startTime =
            performance.now();

        const duration = 2600;

        function frame(currentTime) {

            const elapsed =
                currentTime - startTime;

            const progress =
                Math.min(
                    elapsed / duration,
                    1
                );

            zones.forEach(
                (zone, index) => {

                    const ring =
                        rings[index];

                    const zoneStart =
                        index * 0.12;

                    const zoneProgress =
                        Math.max(
                            0,
                            Math.min(
                                (
                                    progress -
                                    zoneStart
                                ) /
                                (
                                    1 -
                                    zoneStart
                                ),
                                1
                            )
                        );

                    const eased =
                        easeOutCubic(
                            zoneProgress
                        );

                    ring.setRadius(
                        zone.meters * eased
                    );

                    const pulse =
                        Math.sin(
                            zoneProgress *
                            Math.PI
                        );

                    ring.setStyle({
                        opacity:
                            0.65 +
                            pulse * 0.3,

                        fillOpacity:
                            0.04 +
                            pulse * 0.09,

                        weight:
                            2 +
                            pulse * 3
                    });

                }
            );

            if (progress < 1) {

                requestAnimationFrame(
                    frame
                );

            } else {

                zones.forEach(
                    (zone, index) => {

                        rings[index].setRadius(
                            zone.meters
                        );

                        rings[index].setStyle({
                            opacity: 0.9,
                            fillOpacity: 0.08,
                            weight: 2
                        });

                    }
                );

                state.rings = rings;

                resolve();
            }
        }

        requestAnimationFrame(frame);
    });
}

async function activate() {
    if (
        !state.target ||
        state.isAnimating
    ) {
        return;
    }

    state.isAnimating = true;

    elements.activateButton.disabled =
        true;

    elements.activateButton.textContent =
        "ACTIVATING...";

    clearRings();

    lockMap();

    await animateZones();

    await new Promise(
        (resolve) => {
            setTimeout(
                resolve,
                400
            );
        }
    );

    unlockMap();

    state.isAnimating = false;

    elements.activateButton.disabled =
        false;

    elements.activateButton.textContent =
        "ACTIVATE AGAIN";
}

function handlePresetChange(event) {
    if (state.isAnimating) {
        return;
    }

    state.selectedPreset =
        event.currentTarget.dataset.preset;

    elements.presetButtons.forEach(
        (button) => {

            button.classList.toggle(
                "active",
                button.dataset.preset ===
                state.selectedPreset
            );

        }
    );

    updateZones();

    clearRings();
}

async function searchCity(event) {
    event.preventDefault();

    if (state.isAnimating) {
        return;
    }

    const query =
        elements.searchInput.value.trim();

    if (!query) {
        return;
    }

    elements.searchInput.disabled =
        true;

    elements.searchForm.classList.add(
        "searching"
    );

    try {

        const response =
            await fetch(
                "https://nominatim.openstreetmap.org/search" +
                "?format=jsonv2" +
                "&limit=1" +
                "&accept-language=en" +
                "&q=" +
                encodeURIComponent(query)
            );

        if (!response.ok) {
            throw new Error(
                `Search failed: ${response.status}`
            );
        }

        const results =
            await response.json();

        if (!results.length) {

            elements.searchInput.value =
                "";

            elements.searchInput.placeholder =
                "LOCATION NOT FOUND";

            setTimeout(() => {

                elements.searchInput.placeholder =
                    "Search for a city...";

            }, 1800);

            return;
        }

        const result =
            results[0];

        const lat =
            Number(result.lat);

        const lng =
            Number(result.lon);

        setTarget(
            lat,
            lng,
            true
        );

        elements.searchInput.value =
            "";

    } catch (error) {

        console.error(
            "City search failed:",
            error
        );

        elements.searchInput.value =
            "";

        elements.searchInput.placeholder =
            "SEARCH FAILED";

        setTimeout(() => {

            elements.searchInput.placeholder =
                "Search for a city...";

        }, 1800);

    } finally {

        elements.searchInput.disabled =
            false;

        elements.searchForm.classList.remove(
            "searching"
        );
    }
}

elements.presetButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            handlePresetChange
        );

    }
);

elements.activateButton.addEventListener(
    "click",
    activate
);

elements.searchForm.addEventListener(
    "submit",
    searchCity
);

map.on(
    "click",
    (event) => {

        if (
            state.mapLocked ||
            state.isAnimating
        ) {
            return;
        }

        setTarget(
            event.latlng.lat,
            event.latlng.lng
        );

    }
);

updateZones();

setTimeout(
    () => {
        map.invalidateSize();
    },
    300
);

console.log(
    "CONCENTRIC DISTANCE SIMULATOR INITIALIZED"
);
