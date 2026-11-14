# Flowstate Traffic Lab

A browser-based illustrative agent traffic model. It is not a validated real-world traffic prediction. Open `index.html` directly or serve this folder with any static web server.

## Features
- Three scenario presets: downtown grid, arterial corridor, and mixed-use district.
- Each road has its own lane count and speed limit. Lane counts affect road width, headway, and route costs.
- Vehicle symbols have a minimum display size independent of simulated position and spacing. Real on-road queues receive lane-level red highlights; per-direction lane centers stay within each road outline, and signal heads draw above vehicles.
- Arrival demand is adjustable from 1 to 120 vehicles per simulation minute (1, 6, 20, 60, 120). Vehicles that cannot enter immediately stay in a visible source queue.
- The default lane discharge headway is 2 seconds per lane, corresponding to the model's 1,800 vehicles/hour/lane capacity. The capacity control applies a ±20% headway adjustment; this is an explicit model assumption, not a site calibration.
- Vehicles receive boundary origins and destinations, then follow shortest-time routes.
- Vehicle following, lane queues, per-junction signal offsets, protected turns, and junction reservations constrain movement.
- Turning off flyovers removes them from route finding and capacity estimates. Traffic already on one clears to the next junction; other current and waiting trips are rerouted.
- Speed is measured from vehicle distance and time over a rolling 60 simulation-second window. Flow uses completed trips over up to the last 5 simulation minutes. Congestion is the current share of queued vehicles. Trip time is the mean of completed trips.
- The clock advances at 8× real time. Measurements and the 2-second lane headway are illustrative assumptions for scenario exploration, not calibrated transport planning.

## QA

Run `node qa.mjs` to execute fixed-duration model scenarios in a Node VM with a mocked DOM and canvas. It compares Peak-demand controls on all three networks, runs a 600 simulation-second arterial comparison, checks low and heavy demand, demand accounting, run/reset/network-switch state, and draws the loaded scene at phone and desktop canvas sizes. Every 0.25 simulation seconds it compares vehicles sharing an edge, direction, and lane; bumper clearance is center spacing minus the modeled 5 m vehicle length. It also checks that at most one ground-to-ground move uses a junction per tick. These are model-rule checks, not geometric collision detection at intersections. `qa-results.json` is the latest captured output. The mocked canvas checks marker dimensions, queue highlights, and signal draw order, not actual browser layout; this environment could not launch Safari or Chrome.
